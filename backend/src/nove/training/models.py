# ABOUTME: SQLAlchemy models for training plans, workouts, and fitness profiles.
# ABOUTME: Stores coach-generated training data and user workout feedback.

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from nove.database import Base

EXPERIENCE_LEVELS = ("beginner", "intermediate", "advanced")
PLAN_TYPES = ("strength", "cardio", "hybrid")
PLAN_STATUSES = ("active", "completed", "archived")
WORKOUT_TYPES = ("strength", "cardio")
MOOD_VALUES = ("great", "good", "okay", "bad")
TIME_PREFERENCES = ("morning", "afternoon", "evening")
CARDIO_PREFERENCES = ("running", "cycling", "swimming")


class FitnessProfile(Base):
    __tablename__ = "fitness_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    experience_level: Mapped[str | None] = mapped_column(String(16))
    training_days_per_week: Mapped[int | None] = mapped_column(Integer)
    session_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    available_equipment: Mapped[dict | None] = mapped_column(JSONB)
    training_goals: Mapped[dict | None] = mapped_column(JSONB)
    injuries_limitations: Mapped[dict | None] = mapped_column(JSONB)
    preferred_time: Mapped[str | None] = mapped_column(String(16))
    cardio_preference: Mapped[str | None] = mapped_column(String(16))
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text)
    plan_type: Mapped[str] = mapped_column(String(16))
    duration_weeks: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    workouts: Mapped[list["Workout"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("training_plans.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    week_number: Mapped[int] = mapped_column(Integer)
    day_of_week: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(256))
    workout_type: Mapped[str] = mapped_column(String(16))
    details: Mapped[dict] = mapped_column(JSONB)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    calendar_event_id: Mapped[str | None] = mapped_column(String(256))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    plan: Mapped[TrainingPlan] = relationship(back_populates="workouts")
    logs: Mapped[list["WorkoutLog"]] = relationship(back_populates="workout", cascade="all, delete-orphan")


class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workouts.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    perceived_effort: Mapped[int] = mapped_column(Integer)
    completed_fully: Mapped[bool] = mapped_column(Boolean, default=True)
    mood: Mapped[str | None] = mapped_column(String(8))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workout: Mapped[Workout] = relationship(back_populates="logs")
