# ABOUTME: Pydantic response models for the dashboard snapshot endpoint.
# ABOUTME: Defines the full shape of the aggregated healthspan data.

from datetime import date, datetime

from pydantic import BaseModel


class ScoreRead(BaseModel):
    value: float | None
    label: str
    color: str | None


class NoveAgeRead(BaseModel):
    physiological: int | None
    chronological: int | None
    delta: int | None
    inputs_used: int


class GarminStatus(BaseModel):
    connected: bool
    last_sync: datetime | None


class TrendPoint(BaseModel):
    date: date
    value: float


class CardioPillar(BaseModel):
    resting_hr: int | None
    vo2_max: float | None
    fitness_age: int | None
    hr_trend: list[TrendPoint]


class SleepPillar(BaseModel):
    last_night_score: int | None
    duration_hours: float | None
    deep_pct: float | None
    rem_pct: float | None
    duration_trend: list[TrendPoint]


class ActivityPillar(BaseModel):
    steps: int | None
    active_minutes: int | None
    calories: int | None
    steps_trend: list[TrendPoint]


class BiomarkerRead(BaseModel):
    code: str
    name: str
    value: float
    unit: str
    status: str
    reference_range_low: float | None
    reference_range_high: float | None


class MetabolicPillar(BaseModel):
    biomarkers: list[BiomarkerRead]


class StressPillar(BaseModel):
    avg_stress: int | None
    body_battery: int | None
    stress_trend: list[TrendPoint]


class PillarsRead(BaseModel):
    cardio: CardioPillar | None
    sleep: SleepPillar | None
    activity: ActivityPillar | None
    metabolic: MetabolicPillar | None
    stress: StressPillar | None


class ScoresRead(BaseModel):
    recovery: ScoreRead
    strain: ScoreRead
    sleep: ScoreRead


class DashboardSnapshot(BaseModel):
    scores: ScoresRead
    nove_age: NoveAgeRead
    garmin: GarminStatus
    pillars: PillarsRead
