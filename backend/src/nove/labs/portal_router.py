# ABOUTME: Lab portal API endpoints for partner authentication and result uploads.
# ABOUTME: Separate auth flow from user auth — partners log in with code_prefix + password.

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.config import settings
from nove.database import get_db
from nove.labs.models import LabOrder, LabPanel, LabPartner, LabResult
from nove.labs.schemas import PortalLoginRequest, PortalOrderRead, PortalTokenResponse
from nove.users.models import User

router = APIRouter(prefix="/portal", tags=["portal"])
portal_security = HTTPBearer()


def _create_portal_token(partner_id: uuid.UUID) -> str:
    expire = datetime.now(UTC) + timedelta(hours=8)
    payload = {"sub": str(partner_id), "exp": expire, "type": "portal"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _verify_portal_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "portal":
            return None
        return payload
    except JWTError:
        return None


async def get_current_partner(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(portal_security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabPartner:
    payload = _verify_portal_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    partner = await db.get(LabPartner, payload["sub"])
    if partner is None or not partner.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Partner not found",
        )
    return partner


PortalPartner = Annotated[LabPartner, Depends(get_current_partner)]
PortalDB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/auth/login", response_model=PortalTokenResponse)
async def portal_login(body: PortalLoginRequest, db: PortalDB) -> PortalTokenResponse:
    result = await db.execute(select(LabPartner).where(LabPartner.code_prefix == body.code_prefix))
    partner = result.scalar_one_or_none()

    if (
        partner is None
        or partner.password_hash is None
        or not bcrypt.checkpw(body.password.encode(), partner.password_hash.encode())
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return PortalTokenResponse(
        access_token=_create_portal_token(partner.id),
        partner_id=str(partner.id),
        partner_name=partner.name,
    )


@router.get("/orders", response_model=list[PortalOrderRead])
async def lookup_orders(
    partner: PortalPartner,
    db: PortalDB,
    code: str | None = None,
) -> list[PortalOrderRead]:
    query = (
        select(LabOrder)
        .where(LabOrder.lab_partner_id == partner.id)
        .order_by(LabOrder.created_at.desc())
    )
    if code:
        query = query.where(LabOrder.order_code == code)

    result = await db.execute(query)
    orders = result.scalars().all()

    portal_orders = []
    for order in orders:
        panel = await db.get(LabPanel, order.panel_id)
        user = await db.get(User, order.user_id)
        portal_orders.append(
            PortalOrderRead(
                id=order.id,
                order_code=order.order_code,
                status=order.status,
                panel_name=panel.name if panel else "Unknown",
                user_name=user.full_name if user else "Unknown",
                created_at=order.created_at,
            )
        )
    return portal_orders


@router.post(
    "/orders/{order_id}/results",
    status_code=status.HTTP_201_CREATED,
)
async def upload_result(
    order_id: uuid.UUID,
    file: UploadFile,
    partner: PortalPartner,
    db: PortalDB,
) -> dict:
    result = await db.execute(
        select(LabOrder).where(
            LabOrder.id == order_id,
            LabOrder.lab_partner_id == partner.id,
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files accepted",
        )

    pdf_key = f"results/{order.order_code}/{file.filename}"

    # Read file content for future pipeline processing
    await file.read()

    lab_result = LabResult(
        user_id=order.user_id,
        order_id=order.id,
        pdf_storage_key=pdf_key,
        processing_status="pending",
    )
    db.add(lab_result)

    order.status = "completed"
    await db.commit()
    await db.refresh(lab_result)

    # TODO: Trigger Inngest event for PDF processing
    # await inngest_client.send(inngest.Event(name="lab/result.received", data={...}))

    return {"result_id": str(lab_result.id), "status": "pending"}
