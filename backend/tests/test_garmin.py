# ABOUTME: Tests for Garmin integration endpoints and webhook processing.
# ABOUTME: Validates OAuth flow, connection management, data queries, and push notifications.

import uuid
from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.garmin.service import generate_pkce

PREFIX = "/api/v1"


async def _register_user(client: AsyncClient) -> tuple[dict[str, str], str]:
    """Register a user, return (auth_headers, user_id)."""
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"garmin-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pass1234",
            "full_name": "Garmin User",
        },
    )
    data = resp.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    me_resp = await client.get(f"{PREFIX}/users/me", headers=headers)
    user_id = me_resp.json()["id"]
    return headers, user_id


async def _seed_connection(db: AsyncSession, user_id: str) -> GarminConnection:
    """Create a Garmin connection for testing."""
    conn = GarminConnection(
        user_id=user_id,
        garmin_user_id=f"garmin-{uuid.uuid4().hex[:8]}",
        access_token="test-access-token",
        refresh_token="test-refresh-token",
        token_expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


# --- PKCE ---


def test_pkce_generation():
    verifier, challenge = generate_pkce()
    assert len(verifier) > 20
    assert len(challenge) > 20
    assert verifier != challenge


# --- Connect URL ---


async def test_get_connect_url(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/garmin/connect-url", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "url" in data
    assert "state" in data
    assert "connect.garmin.com" in data["url"]
    assert "code_challenge" in data["url"]


async def test_connect_url_requires_auth(client: AsyncClient):
    resp = await client.get(f"{PREFIX}/garmin/connect-url")
    assert resp.status_code in (401, 403)


# --- Callback ---


async def test_callback_invalid_state(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.post(
        f"{PREFIX}/garmin/callback",
        json={"code": "fake-code", "state": "bad-state"},
        headers=headers,
    )
    assert resp.status_code == 400


@patch("nove.garmin.router.fetch_garmin_user_id", new_callable=AsyncMock)
@patch("nove.garmin.router.exchange_code", new_callable=AsyncMock)
async def test_callback_success(
    mock_exchange: AsyncMock,
    mock_fetch_uid: AsyncMock,
    client: AsyncClient,
):
    mock_exchange.return_value = {
        "access_token": "garmin-access-123",
        "refresh_token": "garmin-refresh-456",
        "expires_in": 7776000,
    }
    mock_fetch_uid.return_value = "garmin-user-abc"

    headers, _ = await _register_user(client)

    # First get a connect URL to register the state
    url_resp = await client.get(f"{PREFIX}/garmin/connect-url", headers=headers)
    state = url_resp.json()["state"]

    resp = await client.post(
        f"{PREFIX}/garmin/callback",
        json={"code": "auth-code-from-garmin", "state": state},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["garmin_user_id"] == "garmin-user-abc"
    assert data["connected"] is True


# --- Connection status ---


async def test_get_connection_none(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.get(f"{PREFIX}/garmin/connection", headers=headers)
    assert resp.status_code == 200
    assert resp.json() is None


async def test_get_connection_exists(
    client: AsyncClient, db: AsyncSession
):
    headers, user_id = await _register_user(client)
    await _seed_connection(db, user_id)

    resp = await client.get(f"{PREFIX}/garmin/connection", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is True


# --- Disconnect ---


async def test_disconnect(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    await _seed_connection(db, user_id)

    resp = await client.delete(f"{PREFIX}/garmin/connection", headers=headers)
    assert resp.status_code == 204


async def test_disconnect_no_connection(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.delete(f"{PREFIX}/garmin/connection", headers=headers)
    assert resp.status_code == 404


# --- Data queries ---


async def test_get_data_empty(client: AsyncClient):
    headers, _ = await _register_user(client)

    resp = await client.get(
        f"{PREFIX}/garmin/data", params={"data_type": "sleep"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_data_with_points(
    client: AsyncClient, db: AsyncSession
):
    headers, user_id = await _register_user(client)

    today = date.today()
    dp = GarminDataPoint(
        user_id=user_id,
        data_type="sleep",
        date=today,
        data={"durationInSeconds": 28800, "deepSleepDurationInSeconds": 7200},
    )
    db.add(dp)
    await db.commit()

    resp = await client.get(
        f"{PREFIX}/garmin/data",
        params={"data_type": "sleep", "days": 7},
        headers=headers,
    )
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 1
    assert points[0]["data_type"] == "sleep"
    assert points[0]["data"]["durationInSeconds"] == 28800


# --- Webhooks ---


async def test_webhook_push(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)
    conn = await _seed_connection(db, user_id)

    payload = {
        "dailies": [
            {
                "userId": conn.garmin_user_id,
                "calendarDate": date.today().isoformat(),
                "steps": 8500,
                "distanceInMeters": 6200,
                "averageHeartRateInBeatsPerMinute": 72,
            }
        ]
    }

    resp = await client.post(f"{PREFIX}/garmin/webhooks", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_webhook_unknown_user(client: AsyncClient):
    payload = {
        "dailies": [
            {
                "userId": "unknown-garmin-user",
                "calendarDate": date.today().isoformat(),
                "steps": 100,
            }
        ]
    }

    resp = await client.post(f"{PREFIX}/garmin/webhooks", json=payload)
    assert resp.status_code == 200  # Still returns 200, just skips unknown users
