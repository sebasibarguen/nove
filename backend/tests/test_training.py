# ABOUTME: Tests for training endpoints — plan listing, workout detail, progress, and logging.
# ABOUTME: Validates read-only endpoints and the workout log creation flow.

from httpx import AsyncClient

PREFIX = "/api/v1"


async def _register_and_get_headers(client: AsyncClient) -> dict[str, str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": "training@example.com",
            "password": "pass1234",
            "full_name": "Training User",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_no_fitness_profile(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(f"{PREFIX}/training/fitness-profile", headers=headers)
    assert resp.status_code == 200
    assert resp.json() is None


async def test_empty_plans(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(f"{PREFIX}/training/plans", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_progress_no_plan(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(f"{PREFIX}/training/progress", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_workouts"] == 0
    assert data["completion_rate"] == 0.0


async def test_training_card_no_plan(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(f"{PREFIX}/training/card", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_plan_name"] is None
    assert data["completed_this_week"] == 0


async def test_plan_not_found(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(
        f"{PREFIX}/training/plans/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert resp.status_code == 404


async def test_workout_not_found(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(
        f"{PREFIX}/training/workouts/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert resp.status_code == 404


async def test_empty_logs(client: AsyncClient):
    headers = await _register_and_get_headers(client)
    resp = await client.get(f"{PREFIX}/training/logs", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []
