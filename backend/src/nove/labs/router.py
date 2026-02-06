# ABOUTME: User-facing lab API endpoints for panels, orders, results, and biomarkers.
# ABOUTME: Handles lab ordering flow and result retrieval with biomarker history.

import uuid

import structlog
from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from nove.deps import DB, CurrentUser
from nove.labs.models import LabBiomarkerValue, LabOrder, LabPanel, LabResult
from nove.labs.schemas import (
    BiomarkerHistoryPoint,
    OrderCreate,
    OrderRead,
    PanelRead,
    ResultRead,
    ResultSummaryRead,
)
from nove.labs.service import create_order

logger = structlog.get_logger()

router = APIRouter(prefix="/lab", tags=["labs"])


@router.get("/panels", response_model=list[PanelRead])
async def list_panels(db: DB) -> list[PanelRead]:
    result = await db.execute(select(LabPanel).where(LabPanel.active.is_(True)))
    panels = result.scalars().all()
    return [PanelRead.model_validate(p) for p in panels]


@router.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_lab_order(body: OrderCreate, user: CurrentUser, db: DB) -> OrderRead:
    panel = await db.get(LabPanel, body.panel_id)
    if panel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Panel not found")

    order = await create_order(db, user.id, body.panel_id, body.lab_partner_id)
    return OrderRead.model_validate(order)


@router.get("/orders", response_model=list[OrderRead])
async def list_orders(user: CurrentUser, db: DB) -> list[OrderRead]:
    result = await db.execute(
        select(LabOrder).where(LabOrder.user_id == user.id).order_by(LabOrder.created_at.desc())
    )
    orders = result.scalars().all()
    return [OrderRead.model_validate(o) for o in orders]


@router.get("/results", response_model=list[ResultSummaryRead])
async def list_results(user: CurrentUser, db: DB) -> list[ResultSummaryRead]:
    result = await db.execute(
        select(LabResult).where(LabResult.user_id == user.id).order_by(LabResult.created_at.desc())
    )
    results = result.scalars().all()
    return [ResultSummaryRead.model_validate(r) for r in results]


@router.get("/results/{result_id}", response_model=ResultRead)
async def get_result(result_id: uuid.UUID, user: CurrentUser, db: DB) -> ResultRead:
    result = await db.execute(
        select(LabResult)
        .where(LabResult.id == result_id, LabResult.user_id == user.id)
        .options(selectinload(LabResult.biomarker_values))
    )
    lab_result = result.scalar_one_or_none()
    if lab_result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return ResultRead.model_validate(lab_result)


@router.post(
    "/results/upload", response_model=ResultSummaryRead, status_code=status.HTTP_201_CREATED
)
async def upload_result_pdf(file: UploadFile, user: CurrentUser, db: DB) -> ResultSummaryRead:
    """Upload a lab result PDF directly. Triggers OCR + extraction pipeline."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se aceptan archivos PDF"
        )

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Archivo vacio"
        )

    # Create result record
    lab_result = LabResult(
        user_id=user.id,
        pdf_storage_key=f"user-uploads/{user.id}/{file.filename}",
        processing_status="pending",
    )
    db.add(lab_result)
    await db.commit()
    await db.refresh(lab_result)

    from nove.labs.storage import upload_pdf
    upload_pdf(lab_result.pdf_storage_key, pdf_bytes)

    # Process in background (for now, inline — move to Inngest later)
    try:
        from nove.labs.extraction import process_pdf

        biomarkers, confidence, proc_status = await process_pdf(pdf_bytes, lab_result.id)
        lab_result.processing_status = proc_status
        lab_result.confidence_score = confidence

        for bm in biomarkers:
            db.add(LabBiomarkerValue(
                result_id=lab_result.id,
                user_id=user.id,
                biomarker_code=bm["biomarker_code"],
                biomarker_name=bm.get("biomarker_name", ""),
                value=str(bm["value"]),
                unit=bm["unit"],
                reference_range_low=bm.get("reference_range_low"),
                reference_range_high=bm.get("reference_range_high"),
                status=_classify_biomarker(bm),
                confidence=bm.get("confidence", 0.5),
                date=lab_result.created_at,
            ))

        await db.commit()
        await db.refresh(lab_result)
    except Exception:
        logger.exception("pdf_processing_failed", result_id=str(lab_result.id))
        lab_result.processing_status = "failed"
        await db.commit()
        await db.refresh(lab_result)

    return ResultSummaryRead.model_validate(lab_result)


def _classify_biomarker(bm: dict) -> str:
    """Classify a biomarker as normal, borderline, or flagged based on reference range."""
    value = float(bm["value"])
    low = bm.get("reference_range_low")
    high = bm.get("reference_range_high")

    if low is not None and high is not None:
        low_f, high_f = float(low), float(high)
        if low_f <= value <= high_f:
            return "normal"
        margin = (high_f - low_f) * 0.1
        if (low_f - margin) <= value <= (high_f + margin):
            return "borderline"
        return "flagged"
    return "normal"


@router.post("/gmail-import", response_model=list[ResultSummaryRead])
async def gmail_import(user: CurrentUser, db: DB) -> list[ResultSummaryRead]:
    """Search user's Gmail for lab result PDFs and import them."""
    if not user.google_access_token and not user.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay cuenta de Google conectada con acceso a Gmail",
        )

    from nove.labs.gmail import import_lab_pdfs_from_gmail

    results = await import_lab_pdfs_from_gmail(user, db)
    return [ResultSummaryRead.model_validate(r) for r in results]


@router.get(
    "/biomarkers/{biomarker_code}/history",
    response_model=list[BiomarkerHistoryPoint],
)
async def biomarker_history(
    biomarker_code: str, user: CurrentUser, db: DB
) -> list[BiomarkerHistoryPoint]:
    result = await db.execute(
        select(LabBiomarkerValue)
        .where(
            LabBiomarkerValue.user_id == user.id,
            LabBiomarkerValue.biomarker_code == biomarker_code,
        )
        .order_by(LabBiomarkerValue.date)
    )
    values = result.scalars().all()
    return [BiomarkerHistoryPoint.model_validate(v) for v in values]


@router.get("/results/{result_id}/pdf")
async def get_result_pdf(result_id: uuid.UUID, user: CurrentUser, db: DB) -> RedirectResponse:
    """Redirect to a presigned S3 URL for the result PDF."""
    result = await db.execute(
        select(LabResult).where(LabResult.id == result_id, LabResult.user_id == user.id)
    )
    lab_result = result.scalar_one_or_none()
    if lab_result is None or not lab_result.pdf_storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found")

    from nove.labs.storage import generate_download_url

    url = generate_download_url(lab_result.pdf_storage_key)
    return RedirectResponse(url=url)
