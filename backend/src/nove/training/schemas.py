# ABOUTME: Pydantic response models for training endpoints.
# ABOUTME: Read-only schemas for plans, workouts, fitness profile, and progress.

import uuid
from datetime import datetime

from pydantic import BaseModel


class FitnessProfileRead(BaseModel):
    user_id: uuid.UUID
    experience_level: str | None
    training_days_per_week: int | None
    session_duration_minutes: int | None
    available_equipment: list[str] | None
    training_goals: list[str] | None
    injuries_limitations: list[str] | None
    preferred_time: str | None
    cardio_preference: str | None
    notes: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkoutLogRead(BaseModel):
    id: uuid.UUID
    workout_id: uuid.UUID
    completed_at: datetime
    perceived_effort: int
    completed_fully: bool
    mood: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutRead(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    week_number: int
    day_of_week: int
    name: str
    workout_type: str
    details: dict
    order_index: int
    calendar_event_id: str | None
    scheduled_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutDetailRead(WorkoutRead):
    logs: list[WorkoutLogRead]


class TrainingPlanRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    plan_type: str
    duration_weeks: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrainingPlanDetailRead(TrainingPlanRead):
    workouts: list[WorkoutRead]


class WorkoutLogCreate(BaseModel):
    perceived_effort: int
    completed_fully: bool = True
    mood: str | None = None
    notes: str | None = None


class ScheduleWorkoutRequest(BaseModel):
    datetime_iso: str


class ProgressRead(BaseModel):
    total_workouts: int
    completed_workouts: int
    completion_rate: float
    avg_rpe: float | None
    workouts_this_week: int


class TrainingCardRead(BaseModel):
    active_plan_name: str | None
    active_plan_week: int | None
    next_workout: WorkoutRead | None
    completed_this_week: int
