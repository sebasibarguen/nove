# ABOUTME: Pydantic schemas for Pulse API responses.
# ABOUTME: Shapes recovery, strain, and sleep metrics for the Pulse frontend.

from datetime import date
from typing import Literal

from pydantic import BaseModel


class PulseMetric(BaseModel):
    value: float | None
    unit: str
    source: str
    as_of: date | None


Confidence = Literal["high", "medium", "low", "none"]


class RecoveryScore(BaseModel):
    """Nove proprietary 0-100 recovery score, with sub-component breakdown."""

    value: float | None
    confidence: Confidence
    components: dict[str, float]
    as_of: date | None


class PulseToday(BaseModel):
    connected: bool
    recovery: PulseMetric
    # Populated when the Nove score is the source of `recovery`. Lets the UI
    # show the HRV/sleep/RHR contributions on the recovery detail view.
    recovery_detail: RecoveryScore | None
    strain: PulseMetric
    sleep: PulseMetric


class RecoveryPoint(BaseModel):
    date: date
    body_battery_charged: float | None
    body_battery_drained: float | None
    avg_stress: float | None


class StrainPoint(BaseModel):
    date: date
    active_kcal: float | None
    intensity_minutes: float | None
    steps: int | None


class SleepPoint(BaseModel):
    date: date
    total_seconds: float | None
    deep_seconds: float | None
    light_seconds: float | None
    rem_seconds: float | None
    awake_seconds: float | None


class JournalQuestion(BaseModel):
    id: str
    label: str


class JournalEntry(BaseModel):
    date: date
    responses: dict[str, bool]
    notes: str | None


class JournalEntryUpdate(BaseModel):
    responses: dict[str, bool]
    notes: str | None = None
