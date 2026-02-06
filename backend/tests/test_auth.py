# ABOUTME: Tests for auth endpoints: register, login, refresh, protected access.
# ABOUTME: Validates JWT flow, duplicate email handling, and bad credentials.

from httpx import AsyncClient

PREFIX = "/api/v1/auth"


async def test_register_success(client: AsyncClient):
    resp = await client.post(
        f"{PREFIX}/register",
        json={
            "email": "test@example.com",
            "password": "strongpass123",
            "full_name": "Test User",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dupe@example.com",
        "password": "strongpass123",
        "full_name": "First User",
    }
    resp = await client.post(f"{PREFIX}/register", json=payload)
    assert resp.status_code == 201

    resp = await client.post(f"{PREFIX}/register", json=payload)
    assert resp.status_code == 409


async def test_login_success(client: AsyncClient):
    await client.post(
        f"{PREFIX}/register",
        json={
            "email": "login@example.com",
            "password": "mypassword",
            "full_name": "Login User",
        },
    )

    resp = await client.post(
        f"{PREFIX}/login",
        json={
            "email": "login@example.com",
            "password": "mypassword",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        f"{PREFIX}/register",
        json={
            "email": "wrong@example.com",
            "password": "correct",
            "full_name": "User",
        },
    )

    resp = await client.post(
        f"{PREFIX}/login",
        json={
            "email": "wrong@example.com",
            "password": "incorrect",
        },
    )
    assert resp.status_code == 401


async def test_login_nonexistent_email(client: AsyncClient):
    resp = await client.post(
        f"{PREFIX}/login",
        json={
            "email": "nobody@example.com",
            "password": "whatever",
        },
    )
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient):
    resp = await client.post(
        f"{PREFIX}/register",
        json={
            "email": "refresh@example.com",
            "password": "pass123",
            "full_name": "Refresh User",
        },
    )
    refresh_token = resp.json()["refresh_token"]

    resp = await client.post(
        f"{PREFIX}/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_refresh_with_invalid_token(client: AsyncClient):
    resp = await client.post(
        f"{PREFIX}/refresh",
        json={
            "refresh_token": "garbage.token.here",
        },
    )
    assert resp.status_code == 401


async def test_protected_route_with_valid_token(client: AsyncClient):
    resp = await client.post(
        f"{PREFIX}/register",
        json={
            "email": "protected@example.com",
            "password": "pass123",
            "full_name": "Protected User",
        },
    )
    token = resp.json()["access_token"]

    resp = await client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "protected@example.com"


async def test_protected_route_without_token(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_protected_route_with_invalid_token(client: AsyncClient):
    resp = await client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": "Bearer invalid.token.here",
        },
    )
    assert resp.status_code == 401
