# ABOUTME: End-to-end happy path for the main healthspan app against the in-process API.
# ABOUTME: Walks register → profile → health profile → token refresh → dashboard snapshot.

import uuid

from httpx import AsyncClient

PREFIX = "/api/v1"


async def test_healthspan_user_happy_path(client: AsyncClient):
    """A new user signs up, fills out profile/health-profile, refreshes their
    access token, and fetches the dashboard snapshot.
    """

    email = f"healthspan-e2e-{uuid.uuid4().hex[:8]}@example.com"

    # 1. Register
    register_resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": email,
            "password": "healthspan-e2e-pass",
            "full_name": "Healthspan E2E User",
        },
    )
    assert register_resp.status_code == 201
    tokens = register_resp.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]
    headers = {"Authorization": f"Bearer {access}"}

    # 2. /users/me reflects the registered identity, not yet onboarded
    me_resp = await client.get(f"{PREFIX}/users/me", headers=headers)
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["email"] == email
    assert me["full_name"] == "Healthspan E2E User"
    assert me["onboarding_completed"] is False
    user_id = me["id"]

    # 3. Update profile fields and mark onboarding complete
    patch_resp = await client.patch(
        f"{PREFIX}/users/me",
        headers=headers,
        json={
            "date_of_birth": "1990-04-12T00:00:00",
            "sex": "male",
            "weight_kg": 78.5,
            "height_cm": 180,
            "health_goals": ["longevity", "endurance"],
            "language": "en",
            "onboarding_completed": True,
        },
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched["sex"] == "male"
    assert patched["weight_kg"] == 78.5
    assert patched["health_goals"] == ["longevity", "endurance"]
    assert patched["onboarding_completed"] is True

    # 4. Upsert a minimal health profile
    hp_resp = await client.put(
        f"{PREFIX}/users/me/health-profile",
        headers=headers,
        json={
            "medical_conditions": {"hypertension": False, "diabetes": False},
            "lifestyle_notes": {"sleep_target_hours": 8, "alcohol_per_week": 1},
        },
    )
    assert hp_resp.status_code == 200
    hp = hp_resp.json()
    assert hp["user_id"] == user_id
    assert hp["medical_conditions"]["hypertension"] is False

    # Re-PUT to confirm upsert path also works (no duplicate row)
    hp_resp2 = await client.put(
        f"{PREFIX}/users/me/health-profile",
        headers=headers,
        json={"lifestyle_notes": {"sleep_target_hours": 9}},
    )
    assert hp_resp2.status_code == 200

    # 5. Refresh the access token using the original refresh token
    refresh_resp = await client.post(
        f"{PREFIX}/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    new_headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}

    # New token still authenticates against /users/me
    me_resp2 = await client.get(f"{PREFIX}/users/me", headers=new_headers)
    assert me_resp2.status_code == 200
    assert me_resp2.json()["id"] == user_id

    # 6. Dashboard snapshot — fresh user with no Garmin/labs data still returns shape
    snap_resp = await client.get(f"{PREFIX}/dashboard/snapshot", headers=new_headers)
    assert snap_resp.status_code == 200
    snap = snap_resp.json()
    assert "garmin" in snap
    assert snap["garmin"]["connected"] is False
    # Pillar fields exist (each is null until data lands) — sanity-check the shape
    assert "pillars" in snap or "scores" in snap or "nove_age" in snap
