# ABOUTME: End-to-end production test for Garmin integration happy path.
# ABOUTME: Registers a user, connects Garmin via manual OAuth, requests backfill, and verifies.

"""
E2E test for the Garmin integration against a live backend.

Usage:
    # Step 1: Run without a Garmin connection to get the OAuth URL
    E2E_BASE_URL=https://backend-production-0883.up.railway.app/api/v1 \
        pytest tests/test_e2e_garmin.py -v -s

    # Step 2: Open the printed URL in a browser, authorize with Garmin,
    #         copy the callback URL params (code + state)

    # Step 3: Run again with the full flow including backfill
    E2E_BASE_URL=https://backend-production-0883.up.railway.app/api/v1 \
    E2E_GARMIN_CODE=<code> E2E_GARMIN_STATE=<state> \
        pytest tests/test_e2e_garmin.py -v -s

Environment variables:
    E2E_BASE_URL     - API base URL (required)
    E2E_EMAIL        - Reuse an existing test account email
    E2E_PASSWORD     - Reuse an existing test account password
    E2E_GARMIN_CODE  - Garmin OAuth code from callback
    E2E_GARMIN_STATE - Garmin OAuth state from callback
"""

import os

import httpx
import pytest

BASE_URL = os.environ.get("E2E_BASE_URL", "https://backend-production-0883.up.railway.app/api/v1")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def garmin_code() -> str | None:
    return os.environ.get("E2E_GARMIN_CODE")


@pytest.fixture(scope="session")
def garmin_state() -> str | None:
    return os.environ.get("E2E_GARMIN_STATE")


@pytest.fixture(scope="session")
def credentials() -> dict[str, str]:
    email = os.environ.get("E2E_EMAIL", "e2e-garmin@test.nove.health")
    password = os.environ.get("E2E_PASSWORD", "e2e-garmin-pass-2026")
    return {"email": email, "password": password, "full_name": "E2E Garmin Test"}


@pytest.fixture(scope="session")
def auth_headers(base_url: str, credentials: dict[str, str]) -> dict[str, str]:
    """Register or login, return auth headers."""
    token = os.environ.get("E2E_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{base_url}/auth/login",
            json={"email": credentials["email"], "password": credentials["password"]},
        )
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}

        resp = client.post(f"{base_url}/auth/register", json=credentials)
        assert resp.status_code == 201, f"Register failed: {resp.status_code} {resp.text}"
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


class TestGarminE2E:
    """Happy path: register -> connect URL -> callback -> backfill -> read data."""

    def test_01_health_check(self, base_url: str) -> None:
        """Backend is reachable."""
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{base_url}/users/me", headers={"Authorization": "Bearer fake"})
            assert resp.status_code in (401, 403)

    def test_02_auth_works(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Authenticated user can hit /users/me."""
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{base_url}/users/me", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "id" in data
            assert "email" in data
            print(f"\n  User: {data['email']} ({data['id']})")

    def test_03_garmin_connect_url(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Get a valid Garmin OAuth URL with PKCE."""
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{base_url}/garmin/connect-url", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "connect.garmin.com" in data["url"]
            assert "code_challenge" in data["url"]
            assert len(data["state"]) > 20
            print(f"\n  Garmin OAuth URL:\n  {data['url']}")
            print(f"\n  State: {data['state']}")

    def test_04_garmin_connection_before(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Connection status before OAuth callback."""
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            if data is None:
                print("\n  No Garmin connection yet")
            else:
                print(f"\n  Already connected: {data['garmin_user_id']}")

    def test_05_garmin_callback(
        self,
        base_url: str,
        auth_headers: dict[str, str],
        garmin_code: str | None,
        garmin_state: str | None,
    ) -> None:
        """Exchange Garmin OAuth code for tokens (skip if no code provided)."""
        if not garmin_code or not garmin_state:
            pytest.skip("No E2E_GARMIN_CODE/E2E_GARMIN_STATE provided.")

        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{base_url}/garmin/callback",
                json={"code": garmin_code, "state": garmin_state},
                headers=auth_headers,
            )
            assert resp.status_code == 200, f"Callback failed: {resp.status_code} {resp.text}"
            data = resp.json()
            assert data["connected"] is True
            assert len(data["garmin_user_id"]) > 0
            print(f"\n  Connected! Garmin user: {data['garmin_user_id']}")

    def test_06_garmin_connection_after(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Verify connection exists after callback."""
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            if data is None:
                pytest.skip("No Garmin connection")
            assert data["connected"] is True
            print(f"\n  Garmin user: {data['garmin_user_id']}")
            if data.get("last_sync_at"):
                print(f"  Last sync: {data['last_sync_at']}")

    def test_07_garmin_backfill(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Request Garmin to push historical data via webhooks."""
        with httpx.Client(timeout=10) as client:
            conn = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            if conn.json() is None:
                pytest.skip("No Garmin connection")

        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{base_url}/garmin/backfill", headers=auth_headers)
            assert resp.status_code == 200, f"Backfill failed: {resp.status_code} {resp.text}"
            data = resp.json()
            print(f"\n  Backfill: {data['successful']}/{data['total']} types requested")
            print(f"  Types: {', '.join(data['requested_types'])}")

    def test_08_garmin_data_activity(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Read activity data back from the DB."""
        with httpx.Client(timeout=10) as client:
            conn = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            if conn.json() is None:
                pytest.skip("No Garmin connection")

            resp = client.get(
                f"{base_url}/garmin/data",
                params={"data_type": "activity", "days": 7},
                headers=auth_headers,
            )
            assert resp.status_code == 200
            points = resp.json()
            print(f"\n  Activity points: {len(points)}")
            for p in points[:3]:
                d = p["data"]
                steps = d.get("steps", "?")
                hr = d.get("averageHeartRateInBeatsPerMinute", "?")
                print(f"    {p['date']} — steps: {steps}, avg HR: {hr}")

    def test_09_garmin_data_sleep(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Read sleep data back from the DB."""
        with httpx.Client(timeout=10) as client:
            conn = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            if conn.json() is None:
                pytest.skip("No Garmin connection")

            resp = client.get(
                f"{base_url}/garmin/data",
                params={"data_type": "sleep", "days": 7},
                headers=auth_headers,
            )
            assert resp.status_code == 200
            points = resp.json()
            print(f"\n  Sleep points: {len(points)}")
            for p in points[:3]:
                d = p["data"]
                duration = d.get("durationInSeconds")
                hours = f"{duration / 3600:.1f}h" if duration else "?"
                print(f"    {p['date']} — duration: {hours}")

    def test_10_garmin_data_stress(self, base_url: str, auth_headers: dict[str, str]) -> None:
        """Read stress data back from the DB."""
        with httpx.Client(timeout=10) as client:
            conn = client.get(f"{base_url}/garmin/connection", headers=auth_headers)
            if conn.json() is None:
                pytest.skip("No Garmin connection")

            resp = client.get(
                f"{base_url}/garmin/data",
                params={"data_type": "stress", "days": 7},
                headers=auth_headers,
            )
            assert resp.status_code == 200
            points = resp.json()
            print(f"\n  Stress points: {len(points)}")
            for p in points[:3]:
                d = p["data"]
                avg = d.get("averageStressLevel", "?")
                print(f"    {p['date']} — avg stress: {avg}")
