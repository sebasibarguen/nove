# ABOUTME: Tests for the Nove recovery score scoring math and baseline computation.
# ABOUTME: Covers pure math, end-to-end /pulse/today integration, and fallbacks.

import uuid
from datetime import UTC, date, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.pulse.recovery_score import compute_score

PREFIX = "/api/v1"


async def _register_user(client: AsyncClient) -> tuple[dict[str, str], str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"recovery-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pass1234",
            "full_name": "Recovery User",
        },
    )
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    me = await client.get(f"{PREFIX}/users/me", headers=headers)
    return headers, me.json()["id"]


async def _connect_garmin(db: AsyncSession, user_uuid: uuid.UUID) -> None:
    db.add(
        GarminConnection(
            user_id=user_uuid,
            garmin_user_id=f"g-{uuid.uuid4().hex[:8]}",
            access_token="a",
            refresh_token="r",
            token_expires_at=datetime.now(UTC) + timedelta(days=30),
        )
    )


# --- pure scoring math ---


def test_score_all_three_components_high_confidence():
    score = compute_score(
        hrv_today=60,
        hrv_baseline=60,  # at baseline → 50
        rhr_today=55,
        rhr_baseline=55,  # at baseline → 50
        sleep_seconds=8 * 3600,  # 8h, ratio 0.667 → 66.7
    )
    assert score.confidence == "high"
    assert score.components["hrv"] == 50
    assert score.components["rhr"] == 50
    # 0.6*50 + 0.25*66.7 + 0.15*50 = 30 + 16.67 + 7.5 = 54.17
    assert 53 < score.value < 55


def test_score_hrv_above_baseline_pushes_score_up():
    score = compute_score(
        hrv_today=72,  # +20% above baseline
        hrv_baseline=60,
        rhr_today=55,
        rhr_baseline=55,
        sleep_seconds=8 * 3600,
    )
    assert score.confidence == "high"
    # +20% deviation * 250 = +50 → HRV score = 100 (clamped)
    assert score.components["hrv"] == 100


def test_score_hrv_below_baseline_pushes_score_down():
    score = compute_score(
        hrv_today=48,  # -20% below baseline
        hrv_baseline=60,
        rhr_today=55,
        rhr_baseline=55,
        sleep_seconds=8 * 3600,
    )
    # -20% * 250 = -50 → HRV score = 0 (clamped)
    assert score.components["hrv"] == 0


def test_score_rhr_lower_than_baseline_is_better():
    """Lower RHR should boost recovery."""
    above = compute_score(
        hrv_today=60,
        hrv_baseline=60,
        rhr_today=50,
        rhr_baseline=55,  # lower than baseline = recovered
        sleep_seconds=8 * 3600,
    )
    below = compute_score(
        hrv_today=60,
        hrv_baseline=60,
        rhr_today=60,
        rhr_baseline=55,  # higher than baseline = stressed
        sleep_seconds=8 * 3600,
    )
    assert above.components["rhr"] > below.components["rhr"]


def test_score_sleep_only_is_low_confidence():
    score = compute_score(
        hrv_today=None,
        hrv_baseline=None,
        rhr_today=None,
        rhr_baseline=None,
        sleep_seconds=8 * 3600,  # 8h → ratio (8-6)/(9-6) = 0.667 → score 66.7
    )
    assert score.confidence == "low"
    assert score.components == {"sleep": 66.7}


def test_score_sleep_clamps_at_floor_and_ceiling():
    floor = compute_score(None, None, None, None, 5 * 3600)  # < 6h
    ceiling = compute_score(None, None, None, None, 10 * 3600)  # > 9h
    assert floor.components["sleep"] == 0
    assert ceiling.components["sleep"] == 100


def test_score_no_data_returns_none():
    score = compute_score(None, None, None, None, None)
    assert score.value is None
    assert score.confidence == "none"


def test_score_two_components_is_medium_confidence():
    score = compute_score(
        hrv_today=60,
        hrv_baseline=60,
        rhr_today=None,
        rhr_baseline=None,
        sleep_seconds=8 * 3600,
    )
    assert score.confidence == "medium"


# --- end-to-end via /pulse/today ---


async def test_today_uses_nove_score_with_full_baseline(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)
    await _connect_garmin(db, user_uuid)

    today = date.today()

    # Seed a 7-day HRV baseline of 60 + today's value at 72 (+20%)
    for i in range(1, 8):
        db.add(
            GarminDataPoint(
                user_id=user_uuid,
                data_type="vo2max",
                date=today - timedelta(days=i),
                data={"hrvLastNight": 60},
            )
        )
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="vo2max",
            date=today,
            data={"hrvLastNight": 72},
        )
    )

    # Seed an RHR baseline of 55, today at 55
    for i in range(1, 8):
        db.add(
            GarminDataPoint(
                user_id=user_uuid,
                data_type="activity",
                date=today - timedelta(days=i),
                data={"restingHeartRateInBeatsPerMinute": 55},
            )
        )
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="activity",
            date=today,
            data={"restingHeartRateInBeatsPerMinute": 55, "activeKilocalories": 400},
        )
    )

    # Today's sleep
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="sleep",
            date=today,
            data={"durationInSeconds": 8 * 3600},
        )
    )

    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["recovery"]["source"] == "Nove score"
    assert data["recovery"]["unit"] == "/100"
    assert 0 <= data["recovery"]["value"] <= 100
    assert data["recovery_detail"] is not None
    assert data["recovery_detail"]["confidence"] == "high"
    assert data["recovery_detail"]["components"]["hrv"] == 100


async def test_today_falls_back_to_body_battery_without_baseline(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)
    await _connect_garmin(db, user_uuid)

    today = date.today()
    # Only seed body battery and one day of HRV — not enough for baseline
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="stress",
            date=today,
            data={"bodyBatteryChargedValue": 78},
        )
    )
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="vo2max",
            date=today,
            data={"hrvLastNight": 60},
        )
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["recovery"]["source"] == "Body Battery"
    assert data["recovery"]["value"] == 78
    assert data["recovery_detail"] is None
