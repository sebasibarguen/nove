# ABOUTME: Pydantic schemas for lab API request/response validation.
# ABOUTME: Covers panels, orders, results, and biomarker values.

import uuid
from datetime import date, datetime

from pydantic import BaseModel


# Panels
class PanelRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    biomarkers: dict
    price_cents: int
    tier_included: str | None

    model_config = {"from_attributes": True}


# Orders
class OrderCreate(BaseModel):
    panel_id: uuid.UUID
    lab_partner_id: uuid.UUID | None = None


class OrderRead(BaseModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    order_code: str
    status: str
    lab_partner_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


# Results
class BiomarkerValueRead(BaseModel):
    id: uuid.UUID
    biomarker_code: str
    biomarker_name: str
    value: float
    unit: str
    reference_range_low: float | None
    reference_range_high: float | None
    status: str
    confidence: float | None
    date: date

    model_config = {"from_attributes": True}


class ResultRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID | None
    processing_status: str
    ai_summary: str | None
    confidence_score: float | None
    reviewed_by: str | None
    reviewed_at: datetime | None
    created_at: datetime
    biomarker_values: list[BiomarkerValueRead] = []

    model_config = {"from_attributes": True}


class ResultSummaryRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID | None
    processing_status: str
    ai_summary: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# Biomarker history
class BiomarkerHistoryPoint(BaseModel):
    value: float
    unit: str
    status: str
    date: date
    reference_range_low: float | None
    reference_range_high: float | None

    model_config = {"from_attributes": True}


# Portal
class PortalLoginRequest(BaseModel):
    code_prefix: str
    password: str


class PortalTokenResponse(BaseModel):
    access_token: str
    partner_id: str
    partner_name: str


class PortalOrderRead(BaseModel):
    id: uuid.UUID
    order_code: str
    status: str
    panel_name: str
    user_name: str
    created_at: datetime
