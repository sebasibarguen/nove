# ABOUTME: Pure scoring functions for dashboard health metrics.
# ABOUTME: Computes Recovery, Strain, Sleep scores and Nove Age from raw data.


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def score_color(score: int) -> str:
    """Map a 0-100 score to green/yellow/red."""
    if score >= 70:
        return "green"
    if score >= 40:
        return "yellow"
    return "red"


def strain_color(strain: float) -> str:
    """Map a 0-21 strain to light/medium/deep blue gradient."""
    if strain >= 15:
        return "deep"
    if strain >= 8:
        return "medium"
    return "light"


def _weighted_score(components: list[tuple[float | None, float]]) -> int | None:
    """Compute weighted score from (ratio_0_to_1, weight) pairs, redistributing missing weights.

    Returns None if all inputs are missing.
    """
    available = [(ratio, weight) for ratio, weight in components if ratio is not None]
    if not available:
        return None

    total_weight = sum(w for _, w in available)
    score = sum(ratio * (weight / total_weight) for ratio, weight in available)
    return round(score * 100)


def compute_recovery_score(
    sleep_score: float | None = None,
    resting_hr: float | None = None,
    baseline_hr: float | None = None,
    body_battery_charged: float | None = None,
) -> int | None:
    """Compute recovery score 0-100 from sleep, HR deviation, and body battery."""
    sleep_ratio = _clamp(sleep_score / 100) if sleep_score is not None else None

    hr_ratio = None
    if resting_hr is not None and baseline_hr is not None and baseline_hr > 0:
        deviation = abs(resting_hr - baseline_hr) / baseline_hr
        hr_ratio = _clamp(1 - deviation)

    battery_ratio = _clamp(body_battery_charged / 100) if body_battery_charged is not None else None

    return _weighted_score(
        [
            (sleep_ratio, 40),
            (hr_ratio, 30),
            (battery_ratio, 30),
        ]
    )


def compute_strain_score(
    active_minutes: float | None = None,
    avg_active_hr: float | None = None,
    resting_hr: float | None = None,
    max_hr: float | None = None,
    body_battery_drained: float | None = None,
) -> float | None:
    """Compute strain score 0-21 from active time, HR effort, and battery drain."""
    time_ratio = _clamp(active_minutes / 180) if active_minutes is not None else None

    hr_ratio = None
    if avg_active_hr is not None and resting_hr is not None and max_hr is not None:
        hr_range = max_hr - resting_hr
        if hr_range > 0:
            hr_ratio = _clamp((avg_active_hr - resting_hr) / hr_range)

    drain_ratio = _clamp(body_battery_drained / 100) if body_battery_drained is not None else None

    components = [(time_ratio, 0.40), (hr_ratio, 0.35), (drain_ratio, 0.25)]
    available = [(r, w) for r, w in components if r is not None]
    if not available:
        return None

    total_weight = sum(w for _, w in available)
    raw = sum(ratio * (weight / total_weight) for ratio, weight in available)
    return round(raw * 21, 1)


def compute_sleep_score(
    garmin_sleep_score: float | None = None,
    total_sleep_hours: float | None = None,
    deep_sleep_hours: float | None = None,
    rem_sleep_hours: float | None = None,
    awake_minutes: float | None = None,
) -> int | None:
    """Compute sleep score 0-100. Uses Garmin score if available, else computes from components."""
    if garmin_sleep_score is not None:
        return round(_clamp(garmin_sleep_score, 0, 100))

    if total_sleep_hours is None:
        return None

    duration_ratio = _clamp(total_sleep_hours / 8)
    deep_ratio = _clamp(deep_sleep_hours / 1.5) if deep_sleep_hours is not None else None
    rem_ratio = _clamp(rem_sleep_hours / 2.0) if rem_sleep_hours is not None else None
    awake_ratio = _clamp(1 - awake_minutes / 60) if awake_minutes is not None else None

    return _weighted_score(
        [
            (duration_ratio, 40),
            (deep_ratio, 25),
            (rem_ratio, 25),
            (awake_ratio, 10),
        ]
    )


# --- Nove Age ---

_AGE_DELTAS = {
    "resting_hr": [
        (52, -3),
        (60, -1),
        (70, 0),
        (80, 2),
        (float("inf"), 4),
    ],
    "vo2_max": [
        # Reversed: higher is better
        (28, 4),
        (35, 2),
        (42, 0),
        (50, -1),
        (float("inf"), -3),
    ],
    "sleep_stdev": [
        (0.3, -3),
        (0.5, -1),
        (1.0, 0),
        (1.5, 2),
        (float("inf"), 4),
    ],
    "steps": [
        # Reversed: higher is better
        (4000, 4),
        (7000, 2),
        (10000, 0),
        (12000, -1),
        (float("inf"), -3),
    ],
    "glucose": [
        (85, -3),
        (95, -1),
        (99, 0),
        (110, 2),
        (float("inf"), 4),
    ],
    "hba1c": [
        (5.0, -3),
        (5.4, -1),
        (5.6, 0),
        (6.0, 2),
        (float("inf"), 4),
    ],
}

_NOVE_AGE_WEIGHTS = {
    "resting_hr": 20,
    "vo2_max": 20,
    "sleep_stdev": 15,
    "steps": 15,
    "glucose": 10,
    "hba1c": 10,
    "lipid_composite": 10,
}

MIN_NOVE_AGE_INPUTS = 2


def _lookup_delta(table: list[tuple[float, int]], value: float) -> int:
    for threshold, delta in table:
        if value <= threshold:
            return delta
    return table[-1][1]


def _lipid_delta(ldl: float | None, hdl: float | None, triglycerides: float | None) -> int | None:
    """Compute age delta from lipid panel. Returns None if no lipid data."""
    scores = []
    if ldl is not None:
        if ldl <= 100:
            scores.append(-3)
        elif ldl <= 130:
            scores.append(-1)
        elif ldl <= 160:
            scores.append(2)
        else:
            scores.append(4)
    if hdl is not None:
        if hdl >= 60:
            scores.append(-3)
        elif hdl >= 50:
            scores.append(-1)
        elif hdl >= 40:
            scores.append(2)
        else:
            scores.append(4)
    if triglycerides is not None:
        if triglycerides <= 100:
            scores.append(-3)
        elif triglycerides <= 150:
            scores.append(-1)
        elif triglycerides <= 200:
            scores.append(2)
        else:
            scores.append(4)

    if not scores:
        return None
    return round(sum(scores) / len(scores))


def compute_nove_age(
    chronological_age: int | None = None,
    resting_hr: float | None = None,
    vo2_max: float | None = None,
    sleep_stdev_hours: float | None = None,
    avg_steps: float | None = None,
    fasting_glucose: float | None = None,
    hba1c: float | None = None,
    ldl: float | None = None,
    hdl: float | None = None,
    triglycerides: float | None = None,
) -> int | None:
    """Compute Nove Age (physiological age estimate).

    Returns None if chronological_age is missing or fewer than MIN_NOVE_AGE_INPUTS are available.
    """
    if chronological_age is None:
        return None

    deltas: list[tuple[int, int]] = []  # (delta, weight)

    if resting_hr is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["resting_hr"], resting_hr), 20))
    if vo2_max is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["vo2_max"], vo2_max), 20))
    if sleep_stdev_hours is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["sleep_stdev"], sleep_stdev_hours), 15))
    if avg_steps is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["steps"], avg_steps), 15))
    if fasting_glucose is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["glucose"], fasting_glucose), 10))
    if hba1c is not None:
        deltas.append((_lookup_delta(_AGE_DELTAS["hba1c"], hba1c), 10))

    lipid_d = _lipid_delta(ldl, hdl, triglycerides)
    if lipid_d is not None:
        deltas.append((lipid_d, 10))

    if len(deltas) < MIN_NOVE_AGE_INPUTS:
        return None

    total_weight = sum(w for _, w in deltas)
    weighted_delta = sum(d * (w / total_weight) for d, w in deltas)

    return round(chronological_age + weighted_delta)
