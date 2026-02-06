# ABOUTME: Pydantic schemas for Garmin API request/response validation.
# ABOUTME: Covers OAuth flow, connection status, and data queries.

from datetime import date, datetime

from pydantic import BaseModel


class ConnectUrlResponse(BaseModel):
    url: str
    state: str


class CallbackRequest(BaseModel):
    code: str
    state: str


class ConnectionRead(BaseModel):
    garmin_user_id: str
    connected: bool
    last_sync_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DataPointRead(BaseModel):
    data_type: str
    date: date
    data: dict

    model_config = {"from_attributes": True}
