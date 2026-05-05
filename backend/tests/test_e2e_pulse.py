# ABOUTME: End-to-end happy path for the Pulse vertical against the in-process API.
# ABOUTME: Walks register → Garmin OAuth → webhook ingest → Nove score → trends → journal.

import uuid
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.users.models import User

PREFIX = "/api/v1"


def _dailies(garmin_user_id: str, on: date, day_offset: int) -> dict:
    """A realistic Garmin dailies payload for one day."""
    return {
        "userId": garmin_user_id,
        "calendarDate": on.isoformat(),
        "steps": 7000 + day_offset * 200,
        "activeKilocalories": 380 + day_offset * 15,
        "distanceInMeters": 6000 + day_offset * 100,
        "moderateIntensityDurationInSeconds": 600,
        "vigorousIntensityDurationInSeconds": 300,
        # Today's RHR is one beat lower than the baseline so the Nove score has signal.
        "restingHeartRateInBeatsPerMinute": 54 if day_offset == 0 else 55,
        "averageHeartRateInBeatsPerMinute": 70,
        "maxHeartRateInBeatsPerMinute": 165,
    }


def _sleep(garmin_user_id: str, on: date) -> dict:
    return {
        "userId": garmin_user_id,
        "calendarDate": on.isoformat(),
        "durationInSeconds": int(7.8 * 3600),
        "deepSleepDurationInSeconds": 4500,
        "lightSleepDurationInSeconds": 14000,
        "remSleepInSeconds": 6500,
        "awakeDurationInSeconds": 1800,
        "averageSpO2Value": 96,
    }


def _stress(garmin_user_id: str, on: date, day_offset: int) -> dict:
    return {
        "userId": garmin_user_id,
        "calendarDate": on.isoformat(),
        "averageStressLevel": 25 + day_offset,
        "maxStressLevel": 70,
        "restStressDurationInSeconds": 18000,
        "activityStressDurationInSeconds": 3600,
        "bodyBatteryChargedValue": 60 + day_offset,
        "bodyBatteryDrainedValue": 30,
    }


def _user_metrics(garmin_user_id: str, on: date, day_offset: int) -> dict:
    # Today's HRV is +20% above the 7-day baseline of 60 → component score = 100.
    hrv = 72 if day_offset == 0 else 60
    return {
        "userId": garmin_user_id,
        "calendarDate": on.isoformat(),
        "vo2Max": 50,
        "fitnessAge": 30,
        "hrvLastNight": hrv,
    }


@patch("nove.garmin.router.request_backfill", new_callable=AsyncMock)
@patch("nove.garmin.router.fetch_garmin_user_id", new_callable=AsyncMock)
@patch("nove.garmin.router.exchange_code", new_callable=AsyncMock)
async def test_pulse_user_happy_path(
    mock_exchange: AsyncMock,
    mock_fetch_uid: AsyncMock,
    mock_backfill: AsyncMock,
    client: AsyncClient,
    db: AsyncSession,
):
    """A new Pulse user signs up, connects Garmin, ingests data, sees the Nove
    score with high confidence, browses each trend page, and saves a journal entry.
    """

    mock_exchange.return_value = {
        "access_token": "garmin-access-token",
        "refresh_token": "garmin-refresh-token",
        "expires_in": 7776000,
    }
    garmin_user_id = f"garmin-{uuid.uuid4().hex[:8]}"
    mock_fetch_uid.return_value = garmin_user_id

    # 1. Register a new user
    register_resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"pulse-e2e-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pulse-e2e-pass",
            "full_name": "Pulse E2E User",
        },
    )
    assert register_resp.status_code == 201
    headers = {"Authorization": f"Bearer {register_resp.json()['access_token']}"}

    # Grant an active Pulse subscription so paywall-gated routes are accessible.
    me_resp = await client.get(f"{PREFIX}/users/me", headers=headers)
    user_id = me_resp.json()["id"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    user.subscription_status = "active"
    await db.commit()

    # 2. Pulse home before any connection — disconnected state
    today_resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert today_resp.status_code == 200
    body = today_resp.json()
    assert body["connected"] is False
    assert body["recovery"]["value"] is None
    assert body["recovery_detail"] is None

    # 3. Connect Garmin via the real OAuth callback flow (with mocked outbound calls)
    url_resp = await client.get(f"{PREFIX}/garmin/connect-url", headers=headers)
    assert url_resp.status_code == 200
    state = url_resp.json()["state"]

    callback_resp = await client.post(
        f"{PREFIX}/garmin/callback",
        json={"code": "auth-code-from-garmin", "state": state},
        headers=headers,
    )
    assert callback_resp.status_code == 200
    assert callback_resp.json()["connected"] is True

    # 4. Confirm connection visible
    conn_resp = await client.get(f"{PREFIX}/garmin/connection", headers=headers)
    assert conn_resp.status_code == 200
    assert conn_resp.json()["connected"] is True

    # 5. Ingest 8 days of Garmin webhooks (today + 7 baseline days) for every type
    today = date.today()
    for offset in range(8):
        day = today - timedelta(days=offset)
        for payload in (
            {"dailies": [_dailies(garmin_user_id, day, offset)]},
            {"sleep": [_sleep(garmin_user_id, day)]},
            {"stressDetails": [_stress(garmin_user_id, day, offset)]},
            {"userMetrics": [_user_metrics(garmin_user_id, day, offset)]},
        ):
            wh_resp = await client.post(f"{PREFIX}/garmin/webhooks", json=payload)
            assert wh_resp.status_code == 200

    # 6. Pulse home now shows the Nove score with high confidence
    today_resp2 = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert today_resp2.status_code == 200
    body2 = today_resp2.json()
    assert body2["connected"] is True
    assert body2["recovery"]["source"] == "Nove score"
    assert body2["recovery"]["unit"] == "/100"
    assert 0 <= body2["recovery"]["value"] <= 100
    assert body2["recovery_detail"] is not None
    assert body2["recovery_detail"]["confidence"] == "high"
    assert set(body2["recovery_detail"]["components"]) == {"hrv", "sleep", "rhr"}
    # HRV today is +20% above baseline → component saturates at 100
    assert body2["recovery_detail"]["components"]["hrv"] == 100

    # Strain and sleep cards on the home are passthrough
    assert body2["strain"]["source"] == "Active calories"
    assert body2["strain"]["value"] is not None
    assert body2["sleep"]["source"] == "Sleep duration"
    assert body2["sleep"]["value"] is not None

    # 7. Trend pages are populated with all 8 days, ordered ascending
    recovery_trend = (await client.get(f"{PREFIX}/pulse/recovery?days=14", headers=headers)).json()
    assert len(recovery_trend) == 8
    assert recovery_trend[0]["date"] < recovery_trend[-1]["date"]
    assert recovery_trend[-1]["body_battery_charged"] is not None

    strain_trend = (await client.get(f"{PREFIX}/pulse/strain?days=14", headers=headers)).json()
    assert len(strain_trend) == 8
    # Intensity minutes = moderate(10) + 2 * vigorous(5) = 20
    assert strain_trend[-1]["intensity_minutes"] == 20

    sleep_trend = (await client.get(f"{PREFIX}/pulse/sleep?days=14", headers=headers)).json()
    assert len(sleep_trend) == 8
    assert sleep_trend[-1]["total_seconds"] == int(7.8 * 3600)

    # 8. Journal flow — load questions, save entry, read back
    questions = (await client.get(f"{PREFIX}/pulse/journal/questions", headers=headers)).json()
    assert len(questions) >= 4
    question_ids = {q["id"] for q in questions}
    assert {"alcohol", "exercise", "meditation"} <= question_ids

    empty = (await client.get(f"{PREFIX}/pulse/journal/today", headers=headers)).json()
    assert empty["responses"] == {}
    assert empty["notes"] is None

    put_resp = await client.put(
        f"{PREFIX}/pulse/journal/today",
        headers=headers,
        json={
            "responses": {"exercise": True, "meditation": True, "alcohol": False},
            "notes": "Long ride; felt strong on the climbs.",
        },
    )
    assert put_resp.status_code == 200

    saved = (await client.get(f"{PREFIX}/pulse/journal/today", headers=headers)).json()
    assert saved["responses"] == {
        "exercise": True,
        "meditation": True,
        "alcohol": False,
    }
    assert saved["notes"] == "Long ride; felt strong on the climbs."

    # 9. Disconnect Garmin → /pulse/today reflects disconnected state again
    disc_resp = await client.delete(f"{PREFIX}/garmin/connection", headers=headers)
    assert disc_resp.status_code == 204

    today_resp3 = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert today_resp3.status_code == 200
    assert today_resp3.json()["connected"] is False
