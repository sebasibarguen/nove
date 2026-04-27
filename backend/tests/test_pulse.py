# ABOUTME: Tests for the Pulse /today endpoint.
# ABOUTME: Covers auth, unconnected state, and passthrough extraction from garmin data points.

import uuid
from datetime import UTC, date, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nove.garmin.models import GarminConnection, GarminDataPoint

PREFIX = "/api/v1"


async def _register_user(client: AsyncClient) -> tuple[dict[str, str], str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"pulse-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pass1234",
            "full_name": "Pulse User",
        },
    )
    data = resp.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    me_resp = await client.get(f"{PREFIX}/users/me", headers=headers)
    user_id = me_resp.json()["id"]
    return headers, user_id


async def test_today_requires_auth(client: AsyncClient):
    resp = await client.get(f"{PREFIX}/pulse/today")
    assert resp.status_code in (401, 403)


async def test_today_returns_nulls_when_not_connected(client: AsyncClient, db: AsyncSession):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["connected"] is False
    assert data["recovery"]["value"] is None
    assert data["strain"]["value"] is None
    assert data["sleep"]["value"] is None
    assert data["recovery"]["unit"] == "pts"
    assert data["sleep"]["unit"] == "s"


async def test_today_returns_latest_passthrough_metrics(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)

    db.add(
        GarminConnection(
            user_id=user_uuid,
            garmin_user_id=f"g-{uuid.uuid4().hex[:8]}",
            access_token="a",
            refresh_token="r",
            token_expires_at=datetime.now(UTC) + timedelta(days=30),
        )
    )

    today = date.today()
    yesterday = today - timedelta(days=1)

    db.add_all(
        [
            GarminDataPoint(
                user_id=user_uuid,
                data_type="stress",
                date=yesterday,
                data={"bodyBatteryChargedValue": 50},
            ),
            GarminDataPoint(
                user_id=user_uuid,
                data_type="stress",
                date=today,
                data={"bodyBatteryChargedValue": 78},
            ),
            GarminDataPoint(
                user_id=user_uuid,
                data_type="activity",
                date=today,
                data={"activeKilocalories": 420},
            ),
            GarminDataPoint(
                user_id=user_uuid,
                data_type="sleep",
                date=today,
                data={"durationInSeconds": 27000},
            ),
        ]
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["connected"] is True
    assert data["recovery"]["value"] == 78
    assert data["recovery"]["as_of"] == today.isoformat()
    assert data["strain"]["value"] == 420
    assert data["sleep"]["value"] == 27000


async def test_today_handles_missing_fields(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)

    # A data point exists but the expected field is missing from the payload.
    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="stress",
            date=date.today(),
            data={"someOtherField": 42},
        )
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/today", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["recovery"]["value"] is None


async def test_recovery_trend_returns_ordered_points(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)

    today = date.today()
    db.add_all(
        [
            GarminDataPoint(
                user_id=user_uuid,
                data_type="stress",
                date=today - timedelta(days=2),
                data={"bodyBatteryChargedValue": 50, "averageStressLevel": 30},
            ),
            GarminDataPoint(
                user_id=user_uuid,
                data_type="stress",
                date=today,
                data={"bodyBatteryChargedValue": 75, "bodyBatteryDrainedValue": 40},
            ),
        ]
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/recovery?days=7", headers=headers)
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 2
    assert points[0]["date"] < points[1]["date"]
    assert points[1]["body_battery_charged"] == 75
    assert points[1]["body_battery_drained"] == 40
    assert points[0]["avg_stress"] == 30


async def test_strain_trend_computes_intensity_minutes(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)

    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="activity",
            date=date.today(),
            data={
                "activeKilocalories": 500,
                "steps": 9000,
                "moderateIntensityDurationInSeconds": 600,  # 10 minutes moderate
                "vigorousIntensityDurationInSeconds": 300,  # 5 minutes vigorous (counts 2x)
            },
        )
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/strain?days=7", headers=headers)
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 1
    assert points[0]["active_kcal"] == 500
    assert points[0]["steps"] == 9000
    # 10 + 2*5 = 20 intensity minutes
    assert points[0]["intensity_minutes"] == 20


async def test_sleep_trend_shapes_stage_durations(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    user_uuid = uuid.UUID(user_id)

    db.add(
        GarminDataPoint(
            user_id=user_uuid,
            data_type="sleep",
            date=date.today(),
            data={
                "durationInSeconds": 27000,
                "deepSleepDurationInSeconds": 4500,
                "lightSleepDurationInSeconds": 14000,
                "remSleepInSeconds": 6500,
                "awakeDurationInSeconds": 2000,
            },
        )
    )
    await db.commit()

    resp = await client.get(f"{PREFIX}/pulse/sleep?days=7", headers=headers)
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 1
    assert points[0]["total_seconds"] == 27000
    assert points[0]["deep_seconds"] == 4500
    assert points[0]["rem_seconds"] == 6500


async def test_trend_endpoints_respect_days_bounds(client: AsyncClient, db: AsyncSession):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/pulse/recovery?days=0", headers=headers)
    assert resp.status_code == 422

    resp = await client.get(f"{PREFIX}/pulse/sleep?days=365", headers=headers)
    assert resp.status_code == 422


# --- Journal ---


async def test_journal_questions_are_public_to_authed_users(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/pulse/journal/questions", headers=headers)
    assert resp.status_code == 200
    questions = resp.json()
    assert len(questions) > 0
    ids = {q["id"] for q in questions}
    assert "alcohol" in ids
    assert "meditation" in ids


async def test_journal_today_empty_when_no_entry(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/pulse/journal/today", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["responses"] == {}
    assert body["notes"] is None


async def test_journal_today_upsert_round_trip(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.put(
        f"{PREFIX}/pulse/journal/today",
        headers=headers,
        json={
            "responses": {"alcohol": True, "meditation": False, "exercise": True},
            "notes": "Dormí bien.",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["responses"] == {
        "alcohol": True,
        "meditation": False,
        "exercise": True,
    }

    # Second PUT overwrites
    resp = await client.put(
        f"{PREFIX}/pulse/journal/today",
        headers=headers,
        json={"responses": {"alcohol": False}, "notes": None},
    )
    assert resp.status_code == 200
    assert resp.json()["responses"] == {"alcohol": False}
    assert resp.json()["notes"] is None

    # Read-back via GET
    resp = await client.get(f"{PREFIX}/pulse/journal/today", headers=headers)
    assert resp.json()["responses"] == {"alcohol": False}


async def test_journal_today_drops_unknown_question_ids(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.put(
        f"{PREFIX}/pulse/journal/today",
        headers=headers,
        json={
            "responses": {"alcohol": True, "made_up_habit": True},
            "notes": None,
        },
    )
    assert resp.status_code == 200
    # made_up_habit is stripped; alcohol survives
    assert resp.json()["responses"] == {"alcohol": True}


async def test_journal_requires_auth(client: AsyncClient):
    resp = await client.get(f"{PREFIX}/pulse/journal/today")
    assert resp.status_code in (401, 403)

    resp = await client.put(
        f"{PREFIX}/pulse/journal/today",
        json={"responses": {}, "notes": None},
    )
    assert resp.status_code in (401, 403)
