# ABOUTME: FastAPI router for Garmin wearable integration endpoints.
# ABOUTME: OAuth 2.0 PKCE flow, data queries, and webhook receiver.

from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from nove.deps import DB, CurrentUser
from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.garmin.schemas import (
    CallbackRequest,
    ConnectionRead,
    ConnectUrlResponse,
    DataPointRead,
)
from nove.garmin.service import (
    build_auth_url,
    exchange_code,
    fetch_garmin_user_id,
    process_webhook_push,
)

router = APIRouter(prefix="/garmin", tags=["garmin"])


@router.get("/connect-url", response_model=ConnectUrlResponse)
async def get_connect_url(user: CurrentUser) -> ConnectUrlResponse:
    """Generate a Garmin OAuth 2.0 authorization URL with PKCE."""
    url, state_value = build_auth_url()
    return ConnectUrlResponse(url=url, state=state_value)


@router.post("/callback", response_model=ConnectionRead)
async def handle_callback(
    body: CallbackRequest,
    user: CurrentUser,
    db: DB,
) -> ConnectionRead:
    """Exchange authorization code for tokens and store the connection."""
    try:
        tokens = await exchange_code(body.code, body.state)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from None
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to exchange code with Garmin",
        ) from None

    access_token = tokens["access_token"]

    try:
        garmin_user_id = await fetch_garmin_user_id(access_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch Garmin user ID",
        ) from None

    expires_at = datetime.now(UTC) + timedelta(seconds=tokens["expires_in"])

    # Upsert connection
    existing = await db.get(GarminConnection, user.id)
    if existing:
        existing.garmin_user_id = garmin_user_id
        existing.access_token = access_token
        existing.refresh_token = tokens["refresh_token"]
        existing.token_expires_at = expires_at
        connection = existing
    else:
        connection = GarminConnection(
            user_id=user.id,
            garmin_user_id=garmin_user_id,
            access_token=access_token,
            refresh_token=tokens["refresh_token"],
            token_expires_at=expires_at,
        )
        db.add(connection)

    await db.commit()
    await db.refresh(connection)

    return ConnectionRead(
        garmin_user_id=connection.garmin_user_id,
        connected=True,
        last_sync_at=connection.last_sync_at,
        created_at=connection.created_at,
    )


@router.get("/connection", response_model=ConnectionRead | None)
async def get_connection(user: CurrentUser, db: DB) -> ConnectionRead | None:
    """Check if the user has a Garmin connection."""
    connection = await db.get(GarminConnection, user.id)
    if not connection:
        return None

    return ConnectionRead(
        garmin_user_id=connection.garmin_user_id,
        connected=True,
        last_sync_at=connection.last_sync_at,
        created_at=connection.created_at,
    )


@router.delete("/connection", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect(user: CurrentUser, db: DB) -> None:
    """Disconnect Garmin account."""
    connection = await db.get(GarminConnection, user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="No Garmin connection found")

    await db.delete(connection)
    await db.commit()


@router.get("/data", response_model=list[DataPointRead])
async def get_data(
    user: CurrentUser,
    db: DB,
    data_type: str = "activity",
    days: int = 7,
) -> list[DataPointRead]:
    """Query stored Garmin data points by type and time range."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    result = await db.execute(
        select(GarminDataPoint)
        .where(
            GarminDataPoint.user_id == user.id,
            GarminDataPoint.data_type == data_type,
            GarminDataPoint.date >= start_date,
            GarminDataPoint.date <= end_date,
        )
        .order_by(GarminDataPoint.date.desc())
    )
    points = result.scalars().all()

    return [
        DataPointRead(data_type=p.data_type, date=p.date, data=p.data)
        for p in points
    ]


@router.post("/webhooks", status_code=status.HTTP_200_OK)
async def receive_webhook(request: Request, db: DB) -> dict[str, str]:
    """Receive push notifications from Garmin Health API."""
    payload = await request.json()
    await process_webhook_push(db, payload)
    return {"status": "ok"}
