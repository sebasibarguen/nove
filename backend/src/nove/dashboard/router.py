# ABOUTME: Dashboard snapshot endpoint aggregating wearable, lab, and scoring data.
# ABOUTME: Single GET endpoint returns everything the frontend dashboard needs.

import statistics
from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.dashboard.schemas import (
    ActivityPillar,
    BiomarkerRead,
    CardioPillar,
    DashboardSnapshot,
    GarminStatus,
    MetabolicPillar,
    NoveAgeRead,
    OnboardingStatus,
    PillarsRead,
    ScoreRead,
    ScoresRead,
    SleepPillar,
    StressPillar,
    TrendPoint,
)
from nove.dashboard.scoring import (
    compute_nove_age,
    compute_recovery_score,
    compute_sleep_score,
    compute_strain_score,
    score_color,
    strain_color,
)
from nove.deps import DB, CurrentUser
from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.labs.models import LabBiomarkerValue
from nove.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

METABOLIC_CODES = {"glucose", "hba1c", "ldl", "hdl", "triglycerides"}


def _safe_int(data: dict, key: str) -> int | None:
    v = data.get(key)
    return int(v) if isinstance(v, (int, float)) else None


def _safe_float(data: dict, key: str) -> float | None:
    v = data.get(key)
    return float(v) if isinstance(v, (int, float)) else None


async def _fetch_garmin_points(
    db: AsyncSession, user_id, days: int = 7
) -> dict[str, list[GarminDataPoint]]:
    """Fetch garmin data points grouped by type for the last N days."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    result = await db.execute(
        select(GarminDataPoint)
        .where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.date >= start_date,
            GarminDataPoint.date <= end_date,
        )
        .order_by(GarminDataPoint.date.asc())
    )
    points = result.scalars().all()

    grouped: dict[str, list[GarminDataPoint]] = {}
    for p in points:
        grouped.setdefault(p.data_type, []).append(p)
    return grouped


def _build_scores(
    activity_points: list[GarminDataPoint],
    sleep_points: list[GarminDataPoint],
    stress_points: list[GarminDataPoint],
    user: User,
) -> ScoresRead:
    """Compute the three hero scores from Garmin data."""
    # Gather inputs for recovery
    sleep_score_val = None
    resting_hr = None
    baseline_hr = None
    battery_charged = None

    if sleep_points:
        latest_sleep = sleep_points[-1].data
        sleep_score_val = _safe_float(latest_sleep, "overallSleepScore")

    rhr_values = []
    for p in activity_points:
        rhr = _safe_float(p.data, "restingHeartRateInBeatsPerMinute")
        if rhr is not None:
            rhr_values.append(rhr)
    if rhr_values:
        resting_hr = rhr_values[-1]  # today's
        baseline_hr = sum(rhr_values) / len(rhr_values)  # 7d average

    if activity_points:
        battery_charged = _safe_float(activity_points[-1].data, "bodyBatteryChargedValue")

    recovery_val = compute_recovery_score(
        sleep_score=sleep_score_val,
        resting_hr=resting_hr,
        baseline_hr=baseline_hr,
        body_battery_charged=battery_charged,
    )

    # Strain inputs
    active_minutes = None
    avg_active_hr = None
    battery_drained = None
    max_hr = 190.0
    if user.date_of_birth:
        age = (date.today() - user.date_of_birth.date()).days // 365
        max_hr = float(220 - age)

    if activity_points:
        latest_act = activity_points[-1].data
        active_sec = _safe_float(latest_act, "activeTimeInSeconds")
        if active_sec is not None:
            active_minutes = active_sec / 60
        avg_active_hr = _safe_float(latest_act, "averageHeartRateInBeatsPerMinute")
        battery_drained = _safe_float(latest_act, "bodyBatteryDrainedValue")

    strain_val = compute_strain_score(
        active_minutes=active_minutes,
        avg_active_hr=avg_active_hr,
        resting_hr=resting_hr,
        max_hr=max_hr,
        body_battery_drained=battery_drained,
    )

    # Sleep score
    sleep_computed = None
    if sleep_points:
        latest = sleep_points[-1].data
        sleep_computed = compute_sleep_score(
            garmin_sleep_score=_safe_float(latest, "overallSleepScore"),
            total_sleep_hours=(_safe_float(latest, "durationInSeconds") or 0) / 3600
            if _safe_float(latest, "durationInSeconds")
            else None,
            deep_sleep_hours=(_safe_float(latest, "deepSleepDurationInSeconds") or 0) / 3600
            if _safe_float(latest, "deepSleepDurationInSeconds")
            else None,
            rem_sleep_hours=(_safe_float(latest, "remSleepInSeconds") or 0) / 3600
            if _safe_float(latest, "remSleepInSeconds")
            else None,
            awake_minutes=(_safe_float(latest, "awakeDurationInSeconds") or 0) / 60
            if _safe_float(latest, "awakeDurationInSeconds")
            else None,
        )

    return ScoresRead(
        recovery=ScoreRead(
            value=recovery_val,
            label="Recuperacion",
            color=score_color(recovery_val) if recovery_val is not None else None,
        ),
        strain=ScoreRead(
            value=strain_val,
            label="Esfuerzo",
            color=strain_color(strain_val) if strain_val is not None else None,
        ),
        sleep=ScoreRead(
            value=sleep_computed,
            label="Sueno",
            color=score_color(sleep_computed) if sleep_computed is not None else None,
        ),
    )


def _build_cardio_pillar(
    activity_points: list[GarminDataPoint],
    vo2_points: list[GarminDataPoint],
) -> CardioPillar | None:
    if not activity_points:
        return None

    rhr_values = []
    hr_trend = []
    for p in activity_points:
        rhr = _safe_int(p.data, "restingHeartRateInBeatsPerMinute")
        if rhr is not None:
            rhr_values.append(rhr)
            hr_trend.append(TrendPoint(date=p.date, value=rhr))

    vo2_max = None
    fitness_age = None
    if vo2_points:
        latest_vo2 = vo2_points[-1].data
        vo2_max = _safe_float(latest_vo2, "vo2Max")
        fitness_age = _safe_int(latest_vo2, "fitnessAge")

    return CardioPillar(
        resting_hr=rhr_values[-1] if rhr_values else None,
        vo2_max=vo2_max,
        fitness_age=fitness_age,
        hr_trend=hr_trend,
    )


def _build_sleep_pillar(sleep_points: list[GarminDataPoint]) -> SleepPillar | None:
    if not sleep_points:
        return None

    latest = sleep_points[-1].data
    total_sec = _safe_float(latest, "durationInSeconds")
    deep_sec = _safe_float(latest, "deepSleepDurationInSeconds")
    rem_sec = _safe_float(latest, "remSleepInSeconds")

    duration_hours = round(total_sec / 3600, 1) if total_sec else None
    deep_pct = round(deep_sec / total_sec * 100, 1) if deep_sec and total_sec else None
    rem_pct = round(rem_sec / total_sec * 100, 1) if rem_sec and total_sec else None

    duration_trend = []
    for p in sleep_points:
        dur = _safe_float(p.data, "durationInSeconds")
        if dur is not None:
            duration_trend.append(TrendPoint(date=p.date, value=round(dur / 3600, 1)))

    score = _safe_int(latest, "overallSleepScore")

    return SleepPillar(
        last_night_score=score,
        duration_hours=duration_hours,
        deep_pct=deep_pct,
        rem_pct=rem_pct,
        duration_trend=duration_trend,
    )


def _build_activity_pillar(activity_points: list[GarminDataPoint]) -> ActivityPillar | None:
    if not activity_points:
        return None

    latest = activity_points[-1].data
    active_sec = _safe_float(latest, "activeTimeInSeconds")

    steps_trend = []
    for p in activity_points:
        s = _safe_int(p.data, "steps")
        if s is not None:
            steps_trend.append(TrendPoint(date=p.date, value=s))

    return ActivityPillar(
        steps=_safe_int(latest, "steps"),
        active_minutes=round(active_sec / 60) if active_sec else None,
        calories=_safe_int(latest, "caloriesTotal"),
        steps_trend=steps_trend,
    )


def _build_stress_pillar(stress_points: list[GarminDataPoint]) -> StressPillar | None:
    if not stress_points:
        return None

    latest = stress_points[-1].data
    stress_trend = []
    for p in stress_points:
        lvl = _safe_int(p.data, "averageStressLevel")
        if lvl is not None:
            stress_trend.append(TrendPoint(date=p.date, value=lvl))

    return StressPillar(
        avg_stress=_safe_int(latest, "averageStressLevel"),
        body_battery=_safe_int(latest, "bodyBatteryMostRecentValue"),
        stress_trend=stress_trend,
    )


def _build_metabolic_pillar(biomarkers: list[LabBiomarkerValue]) -> MetabolicPillar | None:
    relevant = [b for b in biomarkers if b.biomarker_code in METABOLIC_CODES]
    if not relevant:
        return None

    return MetabolicPillar(
        biomarkers=[
            BiomarkerRead(
                code=b.biomarker_code,
                name=b.biomarker_name,
                value=b.value,
                unit=b.unit,
                status=b.status,
                reference_range_low=b.reference_range_low,
                reference_range_high=b.reference_range_high,
            )
            for b in relevant
        ]
    )


def _build_nove_age(
    user: User,
    activity_points: list[GarminDataPoint],
    sleep_points: list[GarminDataPoint],
    vo2_points: list[GarminDataPoint],
    biomarkers: list[LabBiomarkerValue],
) -> NoveAgeRead:
    """Assemble inputs and compute Nove Age."""
    chrono_age = None
    if user.date_of_birth:
        chrono_age = (date.today() - user.date_of_birth.date()).days // 365

    # Garmin inputs
    rhr_values = [
        _safe_float(p.data, "restingHeartRateInBeatsPerMinute")
        for p in activity_points
    ]
    rhr_values = [v for v in rhr_values if v is not None]
    avg_rhr = sum(rhr_values) / len(rhr_values) if rhr_values else None

    vo2_max = None
    if vo2_points:
        vo2_max = _safe_float(vo2_points[-1].data, "vo2Max")

    sleep_durations = []
    for p in sleep_points:
        dur = _safe_float(p.data, "durationInSeconds")
        if dur is not None:
            sleep_durations.append(dur / 3600)
    sleep_stdev = statistics.stdev(sleep_durations) if len(sleep_durations) >= 2 else None

    step_values = [_safe_float(p.data, "steps") for p in activity_points]
    step_values = [v for v in step_values if v is not None]
    avg_steps = sum(step_values) / len(step_values) if step_values else None

    # Lab inputs
    bio_map = {b.biomarker_code: b.value for b in biomarkers}

    inputs_used = sum(
        1
        for v in [
            avg_rhr, vo2_max, sleep_stdev, avg_steps,
            bio_map.get("glucose"), bio_map.get("hba1c"),
            bio_map.get("ldl") or bio_map.get("hdl") or bio_map.get("triglycerides"),
        ]
        if v is not None
    )

    phys_age = compute_nove_age(
        chronological_age=chrono_age,
        resting_hr=avg_rhr,
        vo2_max=vo2_max,
        sleep_stdev_hours=sleep_stdev,
        avg_steps=avg_steps,
        fasting_glucose=bio_map.get("glucose"),
        hba1c=bio_map.get("hba1c"),
        ldl=bio_map.get("ldl"),
        hdl=bio_map.get("hdl"),
        triglycerides=bio_map.get("triglycerides"),
    )

    delta = (phys_age - chrono_age) if phys_age is not None and chrono_age is not None else None

    return NoveAgeRead(
        physiological=phys_age,
        chronological=chrono_age,
        delta=delta,
        inputs_used=inputs_used,
    )


@router.get("/snapshot", response_model=DashboardSnapshot)
async def get_snapshot(user: CurrentUser, db: DB) -> DashboardSnapshot:
    """Return the full dashboard snapshot for the authenticated user."""
    # Check Garmin connection
    connection = await db.get(GarminConnection, user.id)
    garmin_status = GarminStatus(
        connected=connection is not None,
        last_sync=connection.last_sync_at if connection else None,
    )

    # Fetch Garmin data
    grouped = await _fetch_garmin_points(db, user.id) if connection else {}
    activity_points = grouped.get("activity", [])
    sleep_points = grouped.get("sleep", [])
    stress_points = grouped.get("stress", [])
    vo2_points = grouped.get("vo2max", [])

    # Fetch latest metabolic biomarkers
    bio_result = await db.execute(
        select(LabBiomarkerValue)
        .where(
            LabBiomarkerValue.user_id == user.id,
            LabBiomarkerValue.biomarker_code.in_(METABOLIC_CODES),
        )
        .order_by(LabBiomarkerValue.date.desc())
        .limit(20)
    )
    all_biomarkers = bio_result.scalars().all()
    # Keep only the latest value per biomarker code
    seen_codes: set[str] = set()
    biomarkers: list[LabBiomarkerValue] = []
    for b in all_biomarkers:
        if b.biomarker_code not in seen_codes:
            seen_codes.add(b.biomarker_code)
            biomarkers.append(b)

    # Build scores
    scores = _build_scores(activity_points, sleep_points, stress_points, user)

    # Build Nove Age
    nove_age = _build_nove_age(user, activity_points, sleep_points, vo2_points, biomarkers)

    # Build pillars
    pillars = PillarsRead(
        cardio=_build_cardio_pillar(activity_points, vo2_points),
        sleep=_build_sleep_pillar(sleep_points),
        activity=_build_activity_pillar(activity_points),
        metabolic=_build_metabolic_pillar(biomarkers),
        stress=_build_stress_pillar(stress_points),
    )

    # Onboarding status for CTAs
    onboarding = OnboardingStatus(
        garmin_connected=connection is not None,
        has_lab_results=len(biomarkers) > 0,
        gmail_available=bool(user.google_access_token or user.google_refresh_token),
    )

    return DashboardSnapshot(
        scores=scores,
        nove_age=nove_age,
        garmin=garmin_status,
        pillars=pillars,
        onboarding=onboarding,
    )
