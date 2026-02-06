# ABOUTME: Garmin OAuth 2.0 PKCE flow and data sync logic.
# ABOUTME: Handles authorization, token exchange/refresh, and data fetching.

import hashlib
import os
import secrets
from base64 import urlsafe_b64encode
from datetime import UTC, datetime, timedelta

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.config import settings
from nove.garmin.models import GarminConnection, GarminDataPoint

logger = structlog.get_logger()

AUTH_URL = "https://connect.garmin.com/oauth2Confirm"
TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token"
USER_ID_URL = "https://apis.garmin.com/wellness-api/rest/user/id"
WELLNESS_BASE = "https://healthapi.garmin.com/wellness-api/rest"

# PKCE verifier/challenge stored in-memory (keyed by state).
# In production, use Redis or DB. Fine for single-instance dev.
_pending_auth: dict[str, str] = {}


def generate_pkce() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    verifier_bytes = os.urandom(32)
    code_verifier = urlsafe_b64encode(verifier_bytes).rstrip(b"=").decode("ascii")
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return code_verifier, code_challenge


def build_auth_url() -> tuple[str, str]:
    """Build the Garmin OAuth 2.0 authorization URL with PKCE.

    Returns (auth_url, state).
    """
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = generate_pkce()

    _pending_auth[state] = code_verifier

    params = {
        "client_id": settings.garmin_client_id,
        "response_type": "code",
        "redirect_uri": settings.garmin_redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    url = AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return url, state


async def exchange_code(code: str, state: str) -> dict:
    """Exchange authorization code for tokens. Returns token response dict."""
    code_verifier = _pending_auth.pop(state, None)
    if not code_verifier:
        raise ValueError("Invalid or expired state parameter")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.garmin_redirect_uri,
                "client_id": settings.garmin_client_id,
                "client_secret": settings.garmin_client_secret,
                "code_verifier": code_verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_garmin_user_id(access_token: str) -> str:
    """Fetch the Garmin user ID using the access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            USER_ID_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["userId"]


async def refresh_tokens(connection: GarminConnection) -> dict:
    """Refresh an expired access token. Returns new token response."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": settings.garmin_client_id,
                "client_secret": settings.garmin_client_secret,
                "refresh_token": connection.refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_valid_token(db: AsyncSession, connection: GarminConnection) -> str:
    """Get a valid access token, refreshing if expired."""
    if connection.token_expires_at > datetime.now(UTC) + timedelta(minutes=5):
        return connection.access_token

    logger.info("refreshing_garmin_token", user_id=str(connection.user_id))
    tokens = await refresh_tokens(connection)

    connection.access_token = tokens["access_token"]
    connection.refresh_token = tokens["refresh_token"]
    connection.token_expires_at = datetime.now(UTC) + timedelta(
        seconds=tokens["expires_in"]
    )
    await db.commit()

    return connection.access_token


# Mapping from our data_type names to Garmin API endpoint paths
DATA_TYPE_ENDPOINTS = {
    "activity": "/dailies",
    "sleep": "/sleep",
    "stress": "/stressDetails",
    "heart_rate": "/dailies",  # HR is part of daily summaries
    "vo2max": "/userMetrics",
    "body_battery": "/stressDetails",  # Body battery is in stress details
}


async def fetch_data(
    access_token: str,
    data_type: str,
    start_ts: int,
    end_ts: int,
) -> list[dict]:
    """Fetch data from the Garmin Health API for a given data type and time range."""
    endpoint = DATA_TYPE_ENDPOINTS.get(data_type)
    if not endpoint:
        return []

    url = f"{WELLNESS_BASE}{endpoint}"
    params = {
        "uploadStartTimeInSeconds": str(start_ts),
        "uploadEndTimeInSeconds": str(end_ts),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()

    return data if isinstance(data, list) else [data]


async def store_data_points(
    db: AsyncSession,
    user_id: str,
    data_type: str,
    points: list[dict],
) -> int:
    """Store fetched Garmin data points, upserting on (user_id, data_type, date)."""
    stored = 0
    for point in points:
        # Extract date from the data point
        calendar_date = point.get("calendarDate")
        if not calendar_date:
            start_time = point.get("startTimeInSeconds")
            if start_time:
                calendar_date = datetime.fromtimestamp(start_time, tz=UTC).strftime("%Y-%m-%d")
            else:
                continue

        from datetime import date as date_type

        point_date = date_type.fromisoformat(calendar_date)

        # Check if exists
        existing = await db.execute(
            select(GarminDataPoint).where(
                GarminDataPoint.user_id == user_id,
                GarminDataPoint.data_type == data_type,
                GarminDataPoint.date == point_date,
            )
        )
        row = existing.scalar_one_or_none()

        if row:
            row.data = point
        else:
            db.add(GarminDataPoint(
                user_id=user_id,
                data_type=data_type,
                date=point_date,
                data=point,
            ))
        stored += 1

    await db.commit()
    return stored


async def process_webhook_push(
    db: AsyncSession,
    payload: dict,
) -> None:
    """Process a Garmin push notification payload.

    Garmin sends data directly in the body, keyed by summary type.
    """
    type_mapping = {
        "dailies": "activity",
        "sleep": "sleep",
        "stressDetails": "stress",
        "userMetrics": "vo2max",
        "activities": "activity",
    }

    for garmin_type, summaries in payload.items():
        data_type = type_mapping.get(garmin_type)
        if not data_type or not isinstance(summaries, list):
            continue

        for summary in summaries:
            garmin_user_id = summary.get("userId")
            if not garmin_user_id:
                continue

            # Look up our user by garmin_user_id
            result = await db.execute(
                select(GarminConnection).where(
                    GarminConnection.garmin_user_id == garmin_user_id
                )
            )
            connection = result.scalar_one_or_none()
            if not connection:
                logger.warning("webhook_unknown_user", garmin_user_id=garmin_user_id)
                continue

            await store_data_points(db, connection.user_id, data_type, [summary])

            connection.last_sync_at = datetime.now(UTC)
            await db.commit()

    logger.info("webhook_processed", types=list(payload.keys()))
