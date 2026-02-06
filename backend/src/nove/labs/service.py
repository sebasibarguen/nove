# ABOUTME: Lab business logic: order code generation, result creation.
# ABOUTME: Shared by user-facing and portal-facing endpoints.

import secrets
import string
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from nove.labs.models import LabOrder, LabPartner, LabResult


def generate_order_code(prefix: str = "NOV") -> str:
    """Generate a unique order code like NOV-A3K9X2."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(6))
    return f"{prefix}-{suffix}"


async def create_order(
    db: AsyncSession,
    user_id: uuid.UUID,
    panel_id: uuid.UUID,
    lab_partner_id: uuid.UUID | None = None,
) -> LabOrder:
    # Determine prefix from lab partner if provided
    prefix = "NOV"
    if lab_partner_id:
        partner = await db.get(LabPartner, lab_partner_id)
        if partner:
            prefix = partner.code_prefix

    order = LabOrder(
        user_id=user_id,
        panel_id=panel_id,
        order_code=generate_order_code(prefix),
        lab_partner_id=lab_partner_id,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def create_result_for_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    order_id: uuid.UUID | None,
    pdf_storage_key: str,
) -> LabResult:
    result = LabResult(
        user_id=user_id,
        order_id=order_id,
        pdf_storage_key=pdf_storage_key,
        processing_status="pending",
    )
    db.add(result)
    await db.commit()
    await db.refresh(result)
    return result
