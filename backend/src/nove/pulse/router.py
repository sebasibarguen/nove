# ABOUTME: FastAPI router for the Pulse vertical.
# ABOUTME: Exposes shaped metrics tailored for the Pulse frontend (pulse.nove.health).

from datetime import date as date_type, datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel

from nove.deps import DB, CurrentUser, PulseUser
from nove.pulse.journal import QUESTIONS, get_entry, upsert_entry
from nove.pulse.schemas import (
    JournalEntry,
    JournalEntryUpdate,
    JournalQuestion,
    PulseToday,
    RecoveryPoint,
    SleepPoint,
    StrainPoint,
)
from nove.pulse.service import (
    get_pulse_today,
    get_recovery_trend,
    get_sleep_trend,
    get_strain_trend,
)

router = APIRouter(prefix="/pulse", tags=["pulse"])


class SubscriptionStatus(BaseModel):
    status: str | None
    trial_ends_at: datetime | None = None


@router.get("/subscription", response_model=SubscriptionStatus)
async def get_subscription(user: CurrentUser) -> SubscriptionStatus:
    """Return the user's Pulse subscription status. Does not require an active subscription."""
    return SubscriptionStatus(
        status=user.subscription_status,
        trial_ends_at=user.trial_ends_at,
    )


@router.get("/today", response_model=PulseToday)
async def read_today(user: PulseUser, db: DB) -> PulseToday:
    return await get_pulse_today(db, user.id)


@router.get("/recovery", response_model=list[RecoveryPoint])
async def read_recovery(
    user: PulseUser,
    db: DB,
    days: int = Query(14, ge=1, le=90),
) -> list[RecoveryPoint]:
    return await get_recovery_trend(db, user.id, days)


@router.get("/strain", response_model=list[StrainPoint])
async def read_strain(
    user: PulseUser,
    db: DB,
    days: int = Query(14, ge=1, le=90),
) -> list[StrainPoint]:
    return await get_strain_trend(db, user.id, days)


@router.get("/sleep", response_model=list[SleepPoint])
async def read_sleep(
    user: PulseUser,
    db: DB,
    days: int = Query(14, ge=1, le=90),
) -> list[SleepPoint]:
    return await get_sleep_trend(db, user.id, days)


@router.get("/journal/questions", response_model=list[JournalQuestion])
async def list_journal_questions() -> list[JournalQuestion]:
    return QUESTIONS


@router.get("/journal/today", response_model=JournalEntry)
async def read_journal_today(user: PulseUser, db: DB) -> JournalEntry:
    return await get_entry(db, user.id, date_type.today())


@router.put("/journal/today", response_model=JournalEntry)
async def write_journal_today(body: JournalEntryUpdate, user: PulseUser, db: DB) -> JournalEntry:
    return await upsert_entry(db, user.id, date_type.today(), body)
