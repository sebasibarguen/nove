# ABOUTME: Pydantic schemas for conversation and message API validation.
# ABOUTME: Request/response models for the coach chat endpoints.

import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str | None = None
    conversation_type: str = "general"


class ConversationRead(BaseModel):
    id: uuid.UUID
    title: str | None
    conversation_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
