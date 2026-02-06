# ABOUTME: Gmail API client for searching and importing lab result PDFs.
# ABOUTME: Uses stored Google OAuth tokens to search user's email for lab attachments.

import base64

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from nove.config import settings
from nove.labs.models import LabResult
from nove.users.models import User

logger = structlog.get_logger()

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

SEARCH_QUERY = (
    "has:attachment filename:pdf "
    "(resultados OR laboratorio OR examen OR hemograma OR analisis OR sangre)"
)

MAX_RESULTS = 20


async def _refresh_google_token(user: User, db: AsyncSession) -> str | None:
    """Refresh a Google access token using the stored refresh token."""
    if not user.google_refresh_token:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": user.google_refresh_token,
                "grant_type": "refresh_token",
            },
        )

    if resp.status_code != 200:
        logger.error("google_token_refresh_failed", status=resp.status_code)
        return None

    tokens = resp.json()
    user.google_access_token = tokens["access_token"]
    await db.commit()
    return tokens["access_token"]


async def _gmail_get(
    path: str, user: User, db: AsyncSession, params: dict | None = None
) -> dict | None:
    """Make an authenticated GET request to the Gmail API. Refreshes token on 401."""
    token = user.google_access_token
    if not token:
        token = await _refresh_google_token(user, db)
        if not token:
            return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GMAIL_API_BASE}/users/me{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )

    if resp.status_code == 401:
        token = await _refresh_google_token(user, db)
        if not token:
            return None
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GMAIL_API_BASE}/users/me{path}",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )

    if resp.status_code != 200:
        return None

    return resp.json()


async def search_gmail_for_lab_pdfs(
    user: User, db: AsyncSession
) -> list[dict]:
    """Search user's Gmail for messages with lab result PDF attachments.

    Returns a list of {message_id, subject, date, attachment_ids} dicts.
    """
    if not user.google_access_token and not user.google_refresh_token:
        return []

    result = await _gmail_get(
        "/messages",
        user,
        db,
        params={"q": SEARCH_QUERY, "maxResults": MAX_RESULTS},
    )

    if not result or "messages" not in result:
        return []

    found = []
    for msg_ref in result["messages"]:
        msg = await _gmail_get(f"/messages/{msg_ref['id']}", user, db)
        if not msg:
            continue

        # Extract subject and date from headers
        headers = {
            h["name"].lower(): h["value"]
            for h in msg.get("payload", {}).get("headers", [])
        }
        subject = headers.get("subject", "(sin asunto)")
        date = headers.get("date", "")

        # Find PDF attachments
        attachment_ids = []
        _find_pdf_attachments(msg.get("payload", {}), attachment_ids)

        if attachment_ids:
            found.append({
                "message_id": msg_ref["id"],
                "subject": subject,
                "date": date,
                "attachment_ids": attachment_ids,
            })

    logger.info("gmail_search_complete", user_id=str(user.id), found=len(found))
    return found


def _find_pdf_attachments(part: dict, result: list[dict]) -> None:
    """Recursively find PDF attachment IDs in a message payload."""
    filename = part.get("filename", "")
    if filename.lower().endswith(".pdf") and part.get("body", {}).get("attachmentId"):
        result.append({
            "attachment_id": part["body"]["attachmentId"],
            "filename": filename,
        })

    for sub_part in part.get("parts", []):
        _find_pdf_attachments(sub_part, result)


async def download_attachment(
    user: User,
    db: AsyncSession,
    message_id: str,
    attachment_id: str,
) -> bytes | None:
    """Download a specific attachment from a Gmail message."""
    data = await _gmail_get(
        f"/messages/{message_id}/attachments/{attachment_id}",
        user,
        db,
    )
    if not data or "data" not in data:
        return None

    # Gmail returns base64url-encoded data
    return base64.urlsafe_b64decode(data["data"])


async def import_lab_pdfs_from_gmail(
    user: User, db: AsyncSession
) -> list[LabResult]:
    """Search Gmail for lab PDFs, download and create LabResult entries.

    Returns created LabResult objects (in pending status for processing).
    """
    messages = await search_gmail_for_lab_pdfs(user, db)
    created = []

    for msg in messages:
        for att in msg["attachment_ids"]:
            pdf_bytes = await download_attachment(
                user, db, msg["message_id"], att["attachment_id"]
            )
            if not pdf_bytes:
                continue

            lab_result = LabResult(
                user_id=user.id,
                pdf_storage_key=f"gmail-import/{user.id}/{att['filename']}",
                processing_status="pending",
            )
            db.add(lab_result)
            await db.commit()
            await db.refresh(lab_result)

            from nove.labs.storage import upload_pdf
            upload_pdf(lab_result.pdf_storage_key, pdf_bytes)

            # Process the PDF
            try:
                from nove.labs.extraction import process_pdf

                biomarkers, confidence, proc_status = await process_pdf(
                    pdf_bytes, lab_result.id
                )
                lab_result.processing_status = proc_status
                lab_result.confidence_score = confidence

                from nove.labs.models import LabBiomarkerValue

                for bm in biomarkers:
                    value = float(bm["value"])
                    low = bm.get("reference_range_low")
                    high = bm.get("reference_range_high")
                    bm_status = "normal"
                    if (
                        low is not None
                        and high is not None
                        and not (float(low) <= value <= float(high))
                    ):
                        bm_status = "flagged"

                    db.add(LabBiomarkerValue(
                        result_id=lab_result.id,
                        user_id=user.id,
                        biomarker_code=bm["biomarker_code"],
                        biomarker_name=bm.get("biomarker_name", ""),
                        value=str(bm["value"]),
                        unit=bm["unit"],
                        reference_range_low=bm.get("reference_range_low"),
                        reference_range_high=bm.get("reference_range_high"),
                        status=bm_status,
                        confidence=bm.get("confidence", 0.5),
                        date=lab_result.created_at,
                    ))

                await db.commit()
                await db.refresh(lab_result)
            except Exception:
                logger.exception(
                    "gmail_pdf_processing_failed", result_id=str(lab_result.id)
                )
                lab_result.processing_status = "failed"
                await db.commit()

            created.append(lab_result)

    logger.info(
        "gmail_import_complete",
        user_id=str(user.id),
        imported=len(created),
    )
    return created
