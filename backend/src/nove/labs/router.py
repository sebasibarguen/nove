# ABOUTME: User-facing lab API endpoints for panels, orders, results, and biomarkers.
# ABOUTME: Handles lab ordering flow and result retrieval with biomarker history.

import uuid

from fastapi import APIRouter, HTTPException, status
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
