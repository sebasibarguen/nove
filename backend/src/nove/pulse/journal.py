# ABOUTME: Pulse daily journal — habits that affect recovery.
# ABOUTME: Static question set for phase 1; user-configurable questions arrive later.

import uuid
from datetime import date as date_type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.pulse.models import PulseJournalEntry
from nove.pulse.schemas import JournalEntry, JournalEntryUpdate, JournalQuestion

# Ordered — UI renders them in this order.
QUESTIONS: list[JournalQuestion] = [
    JournalQuestion(id="alcohol", label="Drank alcohol"),
    JournalQuestion(id="caffeine_late", label="Caffeine after 2pm"),
    JournalQuestion(id="late_meal", label="Heavy or late dinner"),
    JournalQuestion(id="exercise", label="Worked out"),
    JournalQuestion(id="meditation", label="Meditation or breathwork"),
    JournalQuestion(id="stressful_day", label="Stressful day"),
    JournalQuestion(id="dark_cool_room", label="Dark, cool bedroom"),
    JournalQuestion(id="screens_late", label="Screens before bed"),
]

_VALID_IDS = {q.id for q in QUESTIONS}


def _sanitize(responses: dict[str, bool]) -> dict[str, bool]:
    """Drop unknown keys and coerce values to bool."""
    return {k: bool(v) for k, v in responses.items() if k in _VALID_IDS}


async def get_entry(db: AsyncSession, user_id: uuid.UUID, on: date_type) -> JournalEntry:
    result = await db.execute(
        select(PulseJournalEntry).where(
            PulseJournalEntry.user_id == user_id,
            PulseJournalEntry.date == on,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return JournalEntry(date=on, responses={}, notes=None)
    return JournalEntry(date=row.date, responses=row.responses or {}, notes=row.notes)


async def upsert_entry(
    db: AsyncSession,
    user_id: uuid.UUID,
    on: date_type,
    body: JournalEntryUpdate,
) -> JournalEntry:
    responses = _sanitize(body.responses)

    result = await db.execute(
        select(PulseJournalEntry).where(
            PulseJournalEntry.user_id == user_id,
            PulseJournalEntry.date == on,
        )
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = PulseJournalEntry(
            user_id=user_id,
            date=on,
            responses=responses,
            notes=body.notes,
        )
        db.add(row)
    else:
        row.responses = responses
        row.notes = body.notes

    await db.commit()
    await db.refresh(row)

    return JournalEntry(date=row.date, responses=row.responses, notes=row.notes)
