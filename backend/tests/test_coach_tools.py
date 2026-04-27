# ABOUTME: Tests for coach tool handlers — profile save, plan creation, workout logging.
# ABOUTME: Validates DB state after tool execution with known inputs.

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.coach.tools import execute_tool
from nove.training.models import FitnessProfile, TrainingPlan, Workout, WorkoutLog
from nove.users.models import User


async def _create_user(db: AsyncSession) -> User:
    user = User(
        email="tools@example.com",
        full_name="Tools User",
        password_hash="fakehash",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def test_save_fitness_profile_creates(db: AsyncSession):
    user = await _create_user(db)

    result = await execute_tool(
        "save_fitness_profile",
        {
            "experience_level": "intermediate",
            "training_days_per_week": 4,
            "available_equipment": ["mancuernas", "barra"],
            "training_goals": ["fuerza", "resistencia"],
        },
        db,
        user,
    )

    assert "guardado" in result.lower()

    profile = await db.get(FitnessProfile, user.id)
    assert profile is not None
    assert profile.experience_level == "intermediate"
    assert profile.training_days_per_week == 4
    assert profile.available_equipment == ["mancuernas", "barra"]


async def test_save_fitness_profile_updates(db: AsyncSession):
    user = await _create_user(db)

    await execute_tool(
        "save_fitness_profile",
        {"experience_level": "beginner"},
        db,
        user,
    )

    await execute_tool(
        "save_fitness_profile",
        {"experience_level": "intermediate", "training_days_per_week": 5},
        db,
        user,
    )

    profile = await db.get(FitnessProfile, user.id)
    assert profile.experience_level == "intermediate"
    assert profile.training_days_per_week == 5


async def test_create_training_plan(db: AsyncSession):
    user = await _create_user(db)

    result = await execute_tool(
        "create_training_plan",
        {
            "name": "Fuerza Basica",
            "plan_type": "strength",
            "duration_weeks": 4,
            "description": "Plan de fuerza para principiantes",
            "workouts": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Tren superior A",
                    "workout_type": "strength",
                    "details": {
                        "exercises": [
                            {
                                "name": "Press de banca",
                                "sets": 4,
                                "reps": "8-10",
                                "rest_seconds": 90,
                            }
                        ],
                        "warmup": "5 min cardio",
                        "cooldown": "Estiramientos",
                    },
                },
                {
                    "week_number": 1,
                    "day_of_week": 3,
                    "name": "Cardio Zone 2",
                    "workout_type": "cardio",
                    "details": {
                        "activity": "running",
                        "duration_minutes": 30,
                        "target_zone": "zone 2",
                    },
                },
            ],
        },
        db,
        user,
    )

    assert "Fuerza Basica" in result
    assert "2 sesiones" in result

    # Verify DB state
    plans = (await db.execute(select(TrainingPlan).where(TrainingPlan.user_id == user.id))).scalars().all()
    assert len(plans) == 1
    assert plans[0].status == "active"

    workouts = (await db.execute(select(Workout).where(Workout.plan_id == plans[0].id))).scalars().all()
    assert len(workouts) == 2


async def test_create_plan_archives_existing(db: AsyncSession):
    user = await _create_user(db)

    # Create first plan
    await execute_tool(
        "create_training_plan",
        {
            "name": "Plan A",
            "plan_type": "strength",
            "duration_weeks": 2,
            "workouts": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Workout 1",
                    "workout_type": "strength",
                    "details": {"exercises": []},
                },
            ],
        },
        db,
        user,
    )

    # Create second plan
    await execute_tool(
        "create_training_plan",
        {
            "name": "Plan B",
            "plan_type": "cardio",
            "duration_weeks": 3,
            "workouts": [
                {
                    "week_number": 1,
                    "day_of_week": 2,
                    "name": "Cardio 1",
                    "workout_type": "cardio",
                    "details": {"activity": "cycling", "duration_minutes": 45},
                },
            ],
        },
        db,
        user,
    )

    plans = (
        (
            await db.execute(
                select(TrainingPlan).where(TrainingPlan.user_id == user.id).order_by(TrainingPlan.created_at)
            )
        )
        .scalars()
        .all()
    )
    assert len(plans) == 2
    assert plans[0].status == "archived"
    assert plans[1].status == "active"


async def test_log_workout(db: AsyncSession):
    user = await _create_user(db)

    # Create plan + workout
    await execute_tool(
        "create_training_plan",
        {
            "name": "Plan",
            "plan_type": "strength",
            "duration_weeks": 1,
            "workouts": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Workout 1",
                    "workout_type": "strength",
                    "details": {"exercises": []},
                },
            ],
        },
        db,
        user,
    )

    workout = (await db.execute(select(Workout).where(Workout.user_id == user.id))).scalars().first()

    result = await execute_tool(
        "log_workout",
        {
            "workout_id": str(workout.id),
            "perceived_effort": 7,
            "completed_fully": True,
            "mood": "good",
            "notes": "Me senti bien",
        },
        db,
        user,
    )

    assert "RPE: 7/10" in result

    logs = (await db.execute(select(WorkoutLog).where(WorkoutLog.workout_id == workout.id))).scalars().all()
    assert len(logs) == 1
    assert logs[0].perceived_effort == 7
    assert logs[0].mood == "good"


async def test_log_workout_not_found(db: AsyncSession):
    user = await _create_user(db)
    result = await execute_tool(
        "log_workout",
        {
            "workout_id": str(uuid.uuid4()),
            "perceived_effort": 5,
        },
        db,
        user,
    )
    assert "error" in result.lower()


async def test_unknown_tool(db: AsyncSession):
    user = await _create_user(db)
    result = await execute_tool("nonexistent_tool", {}, db, user)
    assert "desconocida" in result.lower()
