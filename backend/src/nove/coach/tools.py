# ABOUTME: Tool definitions and handlers for the AI coach's training capabilities.
# ABOUTME: Each tool is an async function that mutates DB state and returns a summary string.

import uuid
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from nove.training.models import FitnessProfile, TrainingPlan, Workout, WorkoutLog
from nove.users.models import User

TOOL_DEFINITIONS = [
    {
        "name": "save_fitness_profile",
        "description": (
            "Guarda o actualiza el perfil de fitness del usuario. "
            "Usa esta herramienta despues de preguntar sobre experiencia, equipo, dias de entrenamiento y metas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "experience_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced"],
                    "description": "Nivel de experiencia en entrenamiento",
                },
                "training_days_per_week": {
                    "type": "integer",
                    "description": "Dias de entrenamiento por semana (1-7)",
                },
                "session_duration_minutes": {
                    "type": "integer",
                    "description": "Duracion de cada sesion en minutos",
                },
                "available_equipment": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de equipo disponible (ej: mancuernas, barra, bandas)",
                },
                "training_goals": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Metas de entrenamiento (ej: fuerza, resistencia, perdida de grasa)",
                },
                "injuries_limitations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lesiones o limitaciones fisicas",
                },
                "preferred_time": {
                    "type": "string",
                    "enum": ["morning", "afternoon", "evening"],
                    "description": "Hora preferida para entrenar",
                },
                "cardio_preference": {
                    "type": "string",
                    "enum": ["running", "cycling", "swimming"],
                    "description": "Preferencia de cardio",
                },
                "notes": {
                    "type": "string",
                    "description": "Notas adicionales del coach",
                },
            },
            "required": [],
        },
    },
    {
        "name": "create_training_plan",
        "description": (
            "Crea un plan de entrenamiento completo con todos sus workouts. "
            "Archiva cualquier plan activo existente antes de crear el nuevo."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nombre del plan"},
                "description": {"type": "string", "description": "Descripcion del plan"},
                "plan_type": {
                    "type": "string",
                    "enum": ["strength", "cardio", "hybrid"],
                    "description": "Tipo de plan",
                },
                "duration_weeks": {"type": "integer", "description": "Duracion en semanas"},
                "workouts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "week_number": {"type": "integer"},
                            "day_of_week": {
                                "type": "integer",
                                "description": "1=Lunes..7=Domingo",
                            },
                            "name": {"type": "string"},
                            "workout_type": {"type": "string", "enum": ["strength", "cardio"]},
                            "details": {
                                "type": "object",
                                "description": (
                                    "Ejercicios, warmup, cooldown para fuerza; actividad, duracion, zona para cardio"
                                ),
                            },
                        },
                        "required": [
                            "week_number",
                            "day_of_week",
                            "name",
                            "workout_type",
                            "details",
                        ],
                    },
                    "description": "Lista de todos los workouts del plan",
                },
            },
            "required": ["name", "plan_type", "duration_weeks", "workouts"],
        },
    },
    {
        "name": "log_workout",
        "description": (
            "Registra el feedback del usuario despues de completar un workout. "
            "Incluye esfuerzo percibido (RPE 1-10), si lo completo, estado de animo y notas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "workout_id": {"type": "string", "description": "UUID del workout completado"},
                "perceived_effort": {
                    "type": "integer",
                    "description": "RPE 1-10 (1=muy facil, 10=maximo esfuerzo)",
                },
                "completed_fully": {
                    "type": "boolean",
                    "description": "Si completo todo el workout",
                },
                "mood": {
                    "type": "string",
                    "enum": ["great", "good", "okay", "bad"],
                    "description": "Estado de animo despues del workout",
                },
                "notes": {"type": "string", "description": "Notas del usuario sobre el workout"},
            },
            "required": ["workout_id", "perceived_effort"],
        },
    },
    {
        "name": "schedule_workout",
        "description": (
            "Agenda un workout en Google Calendar. Requiere que el usuario tenga conectado Google Calendar."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "workout_id": {"type": "string", "description": "UUID del workout a agendar"},
                "datetime_iso": {
                    "type": "string",
                    "description": "Fecha y hora en formato ISO 8601 (ej: 2026-03-25T07:00:00-06:00)",
                },
            },
            "required": ["workout_id", "datetime_iso"],
        },
    },
]


async def handle_save_fitness_profile(input_data: dict, db: AsyncSession, user: User) -> str:
    """Persist or update the user's fitness profile."""
    profile = await db.get(FitnessProfile, user.id)

    if profile is None:
        profile = FitnessProfile(user_id=user.id)
        db.add(profile)

    for field in (
        "experience_level",
        "training_days_per_week",
        "session_duration_minutes",
        "available_equipment",
        "training_goals",
        "injuries_limitations",
        "preferred_time",
        "cardio_preference",
        "notes",
    ):
        if field in input_data:
            setattr(profile, field, input_data[field])

    await db.commit()
    return "Perfil de fitness guardado correctamente."


async def handle_create_training_plan(input_data: dict, db: AsyncSession, user: User) -> str:
    """Create a training plan with all workouts atomically. Archives existing active plan."""
    # Archive any existing active plan
    await db.execute(
        update(TrainingPlan)
        .where(TrainingPlan.user_id == user.id, TrainingPlan.status == "active")
        .values(status="archived")
    )

    plan = TrainingPlan(
        user_id=user.id,
        name=input_data["name"],
        description=input_data.get("description"),
        plan_type=input_data["plan_type"],
        duration_weeks=input_data["duration_weeks"],
        status="active",
    )
    db.add(plan)
    await db.flush()  # Get plan.id

    workouts_data = input_data.get("workouts", [])
    for idx, w in enumerate(workouts_data):
        workout = Workout(
            plan_id=plan.id,
            user_id=user.id,
            week_number=w["week_number"],
            day_of_week=w["day_of_week"],
            name=w["name"],
            workout_type=w["workout_type"],
            details=w["details"],
            order_index=idx,
        )
        db.add(workout)

    await db.commit()

    return f"Plan creado: {plan.name} ({plan.plan_type}, {plan.duration_weeks} semanas, {len(workouts_data)} sesiones)."


async def handle_log_workout(input_data: dict, db: AsyncSession, user: User) -> str:
    """Record user feedback after completing a workout."""
    workout_id = uuid.UUID(input_data["workout_id"])
    workout = await db.get(Workout, workout_id)

    if workout is None or workout.user_id != user.id:
        return "Error: workout no encontrado."

    log = WorkoutLog(
        workout_id=workout_id,
        user_id=user.id,
        completed_at=datetime.now(UTC),
        perceived_effort=input_data["perceived_effort"],
        completed_fully=input_data.get("completed_fully", True),
        mood=input_data.get("mood"),
        notes=input_data.get("notes"),
    )
    db.add(log)
    await db.commit()

    rpe = input_data["perceived_effort"]
    return f"Feedback registrado para '{workout.name}' — RPE: {rpe}/10."


async def handle_schedule_workout(input_data: dict, db: AsyncSession, user: User) -> str:
    """Schedule a workout on Google Calendar. Placeholder until calendar integration."""
    workout_id = uuid.UUID(input_data["workout_id"])
    workout = await db.get(Workout, workout_id)

    if workout is None or workout.user_id != user.id:
        return "Error: workout no encontrado."

    # Check if user has calendar scope (Phase 4)
    google_scopes = getattr(user, "google_scopes", None) or []
    if "https://www.googleapis.com/auth/calendar.events" not in google_scopes:
        return "Error: necesitas conectar Google Calendar primero. Ve a Configuracion para conectarlo."

    # Phase 4: actual Google Calendar integration will go here
    return "Error: la integracion con Google Calendar aun no esta disponible."


TOOL_HANDLERS = {
    "save_fitness_profile": handle_save_fitness_profile,
    "create_training_plan": handle_create_training_plan,
    "log_workout": handle_log_workout,
    "schedule_workout": handle_schedule_workout,
}


async def execute_tool(tool_name: str, tool_input: dict, db: AsyncSession, user: User) -> str:
    """Dispatch a tool call to its handler. Returns result string for Claude."""
    handler = TOOL_HANDLERS.get(tool_name)
    if handler is None:
        return f"Error: herramienta desconocida '{tool_name}'."
    return await handler(tool_input, db, user)
