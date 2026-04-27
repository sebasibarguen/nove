# ABOUTME: Builds Pulse overview and trend metrics from stored Garmin data points.
# ABOUTME: Phase 1 is passthrough of Body Battery / active calories / sleep duration.

import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.pulse.recovery_score import get_recovery_score
from nove.pulse.schemas import (
    PulseMetric,
    PulseToday,
    RecoveryPoint,
    SleepPoint,
    StrainPoint,
)


async def _latest_point(db: AsyncSession, user_id: uuid.UUID, data_type: str) -> GarminDataPoint | None:
    result = await db.execute(
        select(GarminDataPoint)
        .where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.data_type == data_type,
        )
        .order_by(GarminDataPoint.date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _metric(point: GarminDataPoint | None, field: str, unit: str, source: str) -> PulseMetric:
    if point is None:
        return PulseMetric(value=None, unit=unit, source=source, as_of=None)
    value = _num(point.data.get(field))
    return PulseMetric(value=value, unit=unit, source=source, as_of=point.date)


def _num(raw: object) -> float | None:
    return float(raw) if isinstance(raw, (int, float)) else None


def _int(raw: object) -> int | None:
    return int(raw) if isinstance(raw, (int, float)) else None


async def get_pulse_today(db: AsyncSession, user_id: uuid.UUID) -> PulseToday:
    connection = await db.get(GarminConnection, user_id)
    connected = connection is not None

    stress_point = await _latest_point(db, user_id, "stress")
    activity_point = await _latest_point(db, user_id, "activity")
    sleep_point = await _latest_point(db, user_id, "sleep")

    # Try the Nove score first; only show it if we have enough data to trust it.
    score = await get_recovery_score(db, user_id)
    if score.value is not None and score.confidence in ("high", "medium"):
        recovery = PulseMetric(
            value=score.value,
            unit="/100",
            source="Nove score",
            as_of=score.as_of,
        )
        recovery_detail = score
    else:
        recovery = _metric(stress_point, "bodyBatteryChargedValue", "pts", "Body Battery")
        recovery_detail = None

    return PulseToday(
        connected=connected,
        recovery=recovery,
        recovery_detail=recovery_detail,
        strain=_metric(activity_point, "activeKilocalories", "kcal", "Active calories"),
        sleep=_metric(sleep_point, "durationInSeconds", "s", "Sleep duration"),
    )


async def _range_points(db: AsyncSession, user_id: uuid.UUID, data_type: str, days: int) -> list[GarminDataPoint]:
    end = date.today()
    start = end - timedelta(days=days - 1)
    result = await db.execute(
        select(GarminDataPoint)
        .where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.data_type == data_type,
            GarminDataPoint.date >= start,
            GarminDataPoint.date <= end,
        )
        .order_by(GarminDataPoint.date.asc())
    )
    return list(result.scalars().all())


async def get_recovery_trend(db: AsyncSession, user_id: uuid.UUID, days: int) -> list[RecoveryPoint]:
    points = await _range_points(db, user_id, "stress", days)
    return [
        RecoveryPoint(
            date=p.date,
            body_battery_charged=_num(p.data.get("bodyBatteryChargedValue")),
            body_battery_drained=_num(p.data.get("bodyBatteryDrainedValue")),
            avg_stress=_num(p.data.get("averageStressLevel")),
        )
        for p in points
    ]


async def get_strain_trend(db: AsyncSession, user_id: uuid.UUID, days: int) -> list[StrainPoint]:
    points = await _range_points(db, user_id, "activity", days)
    return [
        StrainPoint(
            date=p.date,
            active_kcal=_num(p.data.get("activeKilocalories")),
            intensity_minutes=_intensity_minutes(p.data),
            steps=_int(p.data.get("steps")),
        )
        for p in points
    ]


def _intensity_minutes(data: dict) -> float | None:
    moderate = _num(data.get("moderateIntensityDurationInSeconds"))
    vigorous = _num(data.get("vigorousIntensityDurationInSeconds"))
    if moderate is None and vigorous is None:
        return None
    # Garmin counts vigorous minutes double (standard convention).
    total_seconds = (moderate or 0) + 2 * (vigorous or 0)
    return total_seconds / 60


async def get_sleep_trend(db: AsyncSession, user_id: uuid.UUID, days: int) -> list[SleepPoint]:
    points = await _range_points(db, user_id, "sleep", days)
    return [
        SleepPoint(
            date=p.date,
            total_seconds=_num(p.data.get("durationInSeconds")),
            deep_seconds=_num(p.data.get("deepSleepDurationInSeconds")),
            light_seconds=_num(p.data.get("lightSleepDurationInSeconds")),
            rem_seconds=_num(p.data.get("remSleepInSeconds")),
            awake_seconds=_num(p.data.get("awakeDurationInSeconds")),
        )
        for p in points
    ]
