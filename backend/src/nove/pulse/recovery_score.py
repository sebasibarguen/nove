# ABOUTME: Nove recovery score — proprietary 0-100 metric blending HRV, sleep, and RHR.
# ABOUTME: HRV deviation drives ~60% of the score; sleep ~25%; RHR ~15%.

import uuid
from collections.abc import Callable
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.garmin.models import GarminDataPoint
from nove.pulse.schemas import RecoveryScore

BASELINE_DAYS = 7
MIN_BASELINE_POINTS = 4

# Weights sum to 1 when all three components are present. When some are missing,
# we renormalize over what's available.
W_HRV = 0.60
W_SLEEP = 0.25
W_RHR = 0.15

# Deviation-to-score sensitivity. A deviation of +20% maps to score ~100;
# -20% maps to ~0. Centered on 50 at baseline.
DEVIATION_GAIN = 250.0

# Sleep score: 6h = 0, 9h = 100, linear in between, clamped.
SLEEP_FLOOR_HOURS = 6.0
SLEEP_CEILING_HOURS = 9.0


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _extract_hrv(data: dict) -> float | None:
    """Garmin's HRV field name varies across endpoints/devices — try several."""
    for key in ("hrvLastNight", "hrvLastNightAvg", "lastNightAvg", "averageHrv"):
        v = data.get(key)
        if isinstance(v, (int, float)) and v > 0:
            return float(v)
    return None


def _extract_rhr(data: dict) -> float | None:
    v = data.get("restingHeartRateInBeatsPerMinute")
    return float(v) if isinstance(v, (int, float)) and v > 0 else None


def _extract_sleep_seconds(data: dict) -> float | None:
    v = data.get("durationInSeconds")
    return float(v) if isinstance(v, (int, float)) and v > 0 else None


def compute_score(
    hrv_today: float | None,
    hrv_baseline: float | None,
    rhr_today: float | None,
    rhr_baseline: float | None,
    sleep_seconds: float | None,
) -> RecoveryScore:
    """Pure scoring function — given today's values and baselines, return a score.

    Confidence:
      - high:   HRV + sleep + RHR all present
      - medium: any 2 components present (HRV preferred)
      - low:    only 1 component (caller should usually fall back to passthrough)
      - none:   no components
    """
    contributions: list[tuple[float, float]] = []
    components: dict[str, float] = {}

    has_hrv = hrv_today is not None and hrv_baseline is not None and hrv_baseline > 0
    has_rhr = rhr_today is not None and rhr_baseline is not None and rhr_baseline > 0
    has_sleep = sleep_seconds is not None

    if has_hrv:
        assert hrv_today is not None and hrv_baseline is not None
        deviation = (hrv_today - hrv_baseline) / hrv_baseline
        hrv_score = _clamp(50 + deviation * DEVIATION_GAIN, 0, 100)
        contributions.append((hrv_score, W_HRV))
        components["hrv"] = round(hrv_score, 1)

    if has_sleep:
        assert sleep_seconds is not None
        hours = sleep_seconds / 3600
        ratio = (hours - SLEEP_FLOOR_HOURS) / (SLEEP_CEILING_HOURS - SLEEP_FLOOR_HOURS)
        sleep_score = _clamp(ratio * 100, 0, 100)
        contributions.append((sleep_score, W_SLEEP))
        components["sleep"] = round(sleep_score, 1)

    if has_rhr:
        assert rhr_today is not None and rhr_baseline is not None
        # Lower RHR than baseline = better recovery; flip the sign.
        deviation = (rhr_baseline - rhr_today) / rhr_baseline
        rhr_score = _clamp(50 + deviation * DEVIATION_GAIN, 0, 100)
        contributions.append((rhr_score, W_RHR))
        components["rhr"] = round(rhr_score, 1)

    if not contributions:
        return RecoveryScore(value=None, confidence="none", components={}, as_of=None)

    total_weight = sum(w for _, w in contributions)
    weighted = sum(s * w for s, w in contributions) / total_weight

    n = len(contributions)
    if n == 3:
        confidence = "high"
    elif n == 2:
        confidence = "medium"
    else:
        confidence = "low"

    return RecoveryScore(
        value=round(weighted, 1),
        confidence=confidence,
        components=components,
        as_of=None,  # caller fills in
    )


async def _today_value(
    db: AsyncSession,
    user_id: uuid.UUID,
    data_type: str,
    on: date_type,
    extract: Callable[[dict], float | None],
) -> float | None:
    result = await db.execute(
        select(GarminDataPoint).where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.data_type == data_type,
            GarminDataPoint.date == on,
        )
    )
    point = result.scalar_one_or_none()
    return extract(point.data) if point else None


async def _baseline(
    db: AsyncSession,
    user_id: uuid.UUID,
    data_type: str,
    on: date_type,
    extract: Callable[[dict], float | None],
) -> float | None:
    """Mean of `extract(data)` for the BASELINE_DAYS strictly before `on`."""
    cutoff = on - timedelta(days=BASELINE_DAYS)
    result = await db.execute(
        select(GarminDataPoint).where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.data_type == data_type,
            GarminDataPoint.date >= cutoff,
            GarminDataPoint.date < on,
        )
    )
    values: list[float] = []
    for point in result.scalars():
        v = extract(point.data)
        if v is not None:
            values.append(v)
    if len(values) < MIN_BASELINE_POINTS:
        return None
    return sum(values) / len(values)


async def get_recovery_score(
    db: AsyncSession,
    user_id: uuid.UUID,
    on: date_type | None = None,
) -> RecoveryScore:
    today = on or date_type.today()

    hrv_today = await _today_value(db, user_id, "vo2max", today, _extract_hrv)
    rhr_today = await _today_value(db, user_id, "activity", today, _extract_rhr)
    sleep_seconds = await _today_value(db, user_id, "sleep", today, _extract_sleep_seconds)

    hrv_baseline = await _baseline(db, user_id, "vo2max", today, _extract_hrv)
    rhr_baseline = await _baseline(db, user_id, "activity", today, _extract_rhr)

    score = compute_score(hrv_today, hrv_baseline, rhr_today, rhr_baseline, sleep_seconds)
    if score.value is not None:
        score = score.model_copy(update={"as_of": today})
    return score
