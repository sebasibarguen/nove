# ABOUTME: Read-only API endpoints for training plans, workouts, and progress.
# ABOUTME: Coach writes data via tools; these endpoints serve the training UI.

import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from nove.deps import DB, CurrentUser
from nove.training.models import FitnessProfile, TrainingPlan, Workout, WorkoutLog
from nove.training.schemas import (
    FitnessProfileRead,
    ProgressRead,
    TrainingCardRead,
    TrainingPlanDetailRead,
    TrainingPlanRead,
    WorkoutDetailRead,
    WorkoutLogCreate,
    WorkoutLogRead,
    WorkoutRead,
)

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/fitness-profile", response_model=FitnessProfileRead | None)
async def get_fitness_profile(user: CurrentUser, db: DB):
    profile = await db.get(FitnessProfile, user.id)
    if profile is None:
        return None
    return FitnessProfileRead.model_validate(profile)


@router.get("/plans", response_model=list[TrainingPlanRead])
async def list_plans(user: CurrentUser, db: DB, plan_status: str | None = None):
    query = select(TrainingPlan).where(TrainingPlan.user_id == user.id)
    if plan_status:
        query = query.where(TrainingPlan.status == plan_status)
    query = query.order_by(TrainingPlan.created_at.desc())

    result = await db.execute(query)
    plans = result.scalars().all()
    return [TrainingPlanRead.model_validate(p) for p in plans]


@router.get("/plans/{plan_id}", response_model=TrainingPlanDetailRead)
async def get_plan(plan_id: uuid.UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(TrainingPlan)
        .options(selectinload(TrainingPlan.workouts))
        .where(TrainingPlan.id == plan_id, TrainingPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    plan.workouts.sort(key=lambda w: (w.week_number, w.day_of_week, w.order_index))
    return TrainingPlanDetailRead.model_validate(plan)


@router.get("/workouts/{workout_id}", response_model=WorkoutDetailRead)
async def get_workout(workout_id: uuid.UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Workout).options(selectinload(Workout.logs)).where(Workout.id == workout_id, Workout.user_id == user.id)
    )
    workout = result.scalar_one_or_none()
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return WorkoutDetailRead.model_validate(workout)


@router.get("/logs", response_model=list[WorkoutLogRead])
async def list_logs(user: CurrentUser, db: DB, days: int = 30):
    since = datetime.now(UTC) - timedelta(days=days)
    result = await db.execute(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user.id, WorkoutLog.completed_at >= since)
        .order_by(WorkoutLog.completed_at.desc())
    )
    logs = result.scalars().all()
    return [WorkoutLogRead.model_validate(log) for log in logs]


@router.post(
    "/workouts/{workout_id}/log",
    response_model=WorkoutLogRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_workout_log(workout_id: uuid.UUID, body: WorkoutLogCreate, user: CurrentUser, db: DB):
    result = await db.execute(select(Workout).where(Workout.id == workout_id, Workout.user_id == user.id))
    workout = result.scalar_one_or_none()
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    log = WorkoutLog(
        workout_id=workout_id,
        user_id=user.id,
        completed_at=datetime.now(UTC),
        perceived_effort=body.perceived_effort,
        completed_fully=body.completed_fully,
        mood=body.mood,
        notes=body.notes,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return WorkoutLogRead.model_validate(log)


@router.get("/progress", response_model=ProgressRead)
async def get_progress(user: CurrentUser, db: DB):
    # Get active plan
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.user_id == user.id, TrainingPlan.status == "active").limit(1)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        return ProgressRead(
            total_workouts=0,
            completed_workouts=0,
            completion_rate=0.0,
            avg_rpe=None,
            workouts_this_week=0,
        )

    # Total workouts in plan
    result = await db.execute(select(func.count()).select_from(Workout).where(Workout.plan_id == plan.id))
    total = result.scalar() or 0

    # Completed workouts (those with logs)
    result = await db.execute(
        select(func.count())
        .select_from(WorkoutLog)
        .join(Workout, WorkoutLog.workout_id == Workout.id)
        .where(Workout.plan_id == plan.id)
    )
    completed = result.scalar() or 0

    # Average RPE
    result = await db.execute(
        select(func.avg(WorkoutLog.perceived_effort))
        .join(Workout, WorkoutLog.workout_id == Workout.id)
        .where(Workout.plan_id == plan.id)
    )
    avg_rpe_raw = result.scalar()
    avg_rpe = round(float(avg_rpe_raw), 1) if avg_rpe_raw is not None else None

    # Workouts this week
    week_start = date.today() - timedelta(days=date.today().weekday())
    result = await db.execute(
        select(func.count())
        .select_from(WorkoutLog)
        .where(
            WorkoutLog.user_id == user.id,
            func.date(WorkoutLog.completed_at) >= week_start,
        )
    )
    this_week = result.scalar() or 0

    completion_rate = (completed / total * 100) if total > 0 else 0.0

    return ProgressRead(
        total_workouts=total,
        completed_workouts=completed,
        completion_rate=round(completion_rate, 1),
        avg_rpe=avg_rpe,
        workouts_this_week=this_week,
    )


@router.get("/card", response_model=TrainingCardRead)
async def get_training_card(user: CurrentUser, db: DB):
    """Training summary card for the dashboard."""
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.user_id == user.id, TrainingPlan.status == "active").limit(1)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        return TrainingCardRead(
            active_plan_name=None,
            active_plan_week=None,
            next_workout=None,
            completed_this_week=0,
        )

    # Current week: count completed workouts to estimate
    result = await db.execute(
        select(func.count())
        .select_from(WorkoutLog)
        .join(Workout, WorkoutLog.workout_id == Workout.id)
        .where(Workout.plan_id == plan.id)
    )
    completed = result.scalar() or 0

    # Get total workouts per week to estimate current week
    result = await db.execute(select(func.count()).select_from(Workout).where(Workout.plan_id == plan.id))
    total = result.scalar() or 1
    workouts_per_week = total / max(plan.duration_weeks, 1)
    current_week = min(int(completed / max(workouts_per_week, 1)) + 1, plan.duration_weeks)

    # Next workout (first without a log)
    result = await db.execute(
        select(Workout)
        .outerjoin(WorkoutLog, WorkoutLog.workout_id == Workout.id)
        .where(Workout.plan_id == plan.id, WorkoutLog.id.is_(None))
        .order_by(Workout.week_number, Workout.day_of_week)
        .limit(1)
    )
    next_workout = result.scalar_one_or_none()

    # Completed this week
    week_start = date.today() - timedelta(days=date.today().weekday())
    result = await db.execute(
        select(func.count())
        .select_from(WorkoutLog)
        .where(
            WorkoutLog.user_id == user.id,
            func.date(WorkoutLog.completed_at) >= week_start,
        )
    )
    this_week = result.scalar() or 0

    return TrainingCardRead(
        active_plan_name=plan.name,
        active_plan_week=current_week,
        next_workout=WorkoutRead.model_validate(next_workout) if next_workout else None,
        completed_this_week=this_week,
    )
