# ABOUTME: Pydantic schemas for user API request/response validation.
# ABOUTME: Separates API contract from database models.

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    date_of_birth: datetime | None = None
    sex: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    health_goals: list[str] | None = None
    language: str
    onboarding_completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    date_of_birth: datetime | None = None
    sex: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    health_goals: list[str] | None = None
    language: str | None = None


class HealthProfileUpdate(BaseModel):
    medical_conditions: dict | None = None
    lifestyle_notes: dict | None = None


class HealthProfileRead(BaseModel):
    user_id: uuid.UUID
    medical_conditions: dict | None = None
    lifestyle_notes: dict | None = None
    ai_summary: str | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}
