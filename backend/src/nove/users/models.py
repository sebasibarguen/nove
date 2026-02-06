# ABOUTME: SQLAlchemy models for users and health profiles.
# ABOUTME: Core user identity and health data storage.

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from nove.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(128))
    google_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(256))
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sex: Mapped[str | None] = mapped_column(String(16))
    weight_kg: Mapped[float | None] = mapped_column(Float)
    height_cm: Mapped[float | None] = mapped_column(Float)
    health_goals: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    language: Mapped[str] = mapped_column(String(8), default="es")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    health_profile: Mapped["UserHealthProfile | None"] = relationship(
        back_populates="user", uselist=False
    )


class UserHealthProfile(Base):
    __tablename__ = "user_health_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    medical_conditions: Mapped[dict | None] = mapped_column(JSONB)
    lifestyle_notes: Mapped[dict | None] = mapped_column(JSONB)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="health_profile")
