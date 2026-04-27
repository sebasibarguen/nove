# ABOUTME: AI coach service handling context assembly and Claude API streaming.
# ABOUTME: Builds conversation context from user profile + history, streams tool-use responses.

import json
import uuid
from collections.abc import AsyncGenerator
from datetime import date, timedelta

import anthropic
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.coach.models import Conversation, Message
from nove.coach.prompts import get_system_prompt
from nove.coach.tools import TOOL_DEFINITIONS, execute_tool
from nove.config import settings
from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.labs.models import LabBiomarkerValue
from nove.training.models import FitnessProfile, TrainingPlan, Workout, WorkoutLog
from nove.users.models import User, UserHealthProfile

MODEL = "claude-sonnet-4-5-20250929"
MAX_HISTORY_MESSAGES = 50
MAX_TOOL_ROUNDS = 5


def _build_profile_context(user: User, profile: UserHealthProfile | None) -> str:
    """Build a text summary of the user's health profile for the system context."""
    parts = [f"Nombre: {user.full_name}"]

    if user.date_of_birth:
        age = (date.today() - user.date_of_birth.date()).days // 365
        parts.append(f"Edad: {age} anos")
    if user.sex:
        parts.append(f"Sexo: {user.sex}")
    if user.weight_kg:
        parts.append(f"Peso: {user.weight_kg} kg")
    if user.height_cm:
        parts.append(f"Altura: {user.height_cm} cm")
    if user.health_goals:
        parts.append(f"Metas: {', '.join(user.health_goals)}")

    if profile:
        if profile.medical_conditions:
            parts.append(f"Condiciones medicas: {profile.medical_conditions}")
        if profile.lifestyle_notes:
            parts.append(f"Estilo de vida: {profile.lifestyle_notes}")

    return "\n".join(parts)


async def _get_conversation_history(db: AsyncSession, conversation_id: uuid.UUID) -> list[dict[str, str]]:
    """Fetch the last N messages for a conversation, formatted for Claude."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
    )
    messages = list(reversed(result.scalars().all()))

    return [{"role": msg.role, "content": msg.content} for msg in messages if msg.role != "system"]


async def _build_wearable_context(db: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Build a 7-day wearable data summary if Garmin is connected."""
    connection = await db.get(GarminConnection, user_id)
    if not connection:
        return None

    end_date = date.today()
    start_date = end_date - timedelta(days=7)

    result = await db.execute(
        select(GarminDataPoint)
        .where(
            GarminDataPoint.user_id == user_id,
            GarminDataPoint.date >= start_date,
            GarminDataPoint.date <= end_date,
        )
        .order_by(GarminDataPoint.date.desc())
    )
    points = result.scalars().all()

    if not points:
        return None

    parts = ["Datos de wearable Garmin (ultimos 7 dias):"]

    sleep_points = [p for p in points if p.data_type == "sleep"]
    if sleep_points:
        durations = []
        for sp in sleep_points:
            total = sp.data.get("durationInSeconds")
            if isinstance(total, (int, float)):
                durations.append(total / 3600)
        if durations:
            avg_sleep = sum(durations) / len(durations)
            parts.append(f"- Sueno promedio: {avg_sleep:.1f} horas/noche")

    activity_points = [p for p in points if p.data_type == "activity"]
    if activity_points:
        steps_list = []
        rhr_list = []
        for ap in activity_points:
            steps = ap.data.get("steps")
            if isinstance(steps, (int, float)):
                steps_list.append(steps)
            rhr = ap.data.get("restingHeartRateInBeatsPerMinute")
            if isinstance(rhr, (int, float)):
                rhr_list.append(rhr)
        if steps_list:
            avg_steps = sum(steps_list) / len(steps_list)
            parts.append(f"- Pasos promedio: {int(avg_steps)}/dia")
        if rhr_list:
            avg_rhr = sum(rhr_list) / len(rhr_list)
            parts.append(f"- FC en reposo promedio: {int(avg_rhr)} bpm")

    stress_points = [p for p in points if p.data_type == "stress"]
    if stress_points:
        stress_levels = []
        for stp in stress_points:
            level = stp.data.get("averageStressLevel")
            if isinstance(level, (int, float)):
                stress_levels.append(level)
        if stress_levels:
            avg_stress = sum(stress_levels) / len(stress_levels)
            parts.append(f"- Nivel de estres promedio: {int(avg_stress)}/100")

    return "\n".join(parts) if len(parts) > 1 else None


async def _build_lab_context(db: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Build a summary of recent lab biomarker values for the system context."""
    result = await db.execute(
        select(LabBiomarkerValue)
        .where(LabBiomarkerValue.user_id == user_id)
        .order_by(LabBiomarkerValue.date.desc())
        .limit(30)
    )
    values = result.scalars().all()

    if not values:
        return None

    parts = []
    for v in values:
        ref = ""
        if v.reference_range_low is not None and v.reference_range_high is not None:
            ref = f" (ref: {v.reference_range_low}-{v.reference_range_high})"
        status_label = v.status.upper() if v.status else ""
        parts.append(f"- {v.biomarker_name} ({v.biomarker_code}): {v.value} {v.unit}{ref} [{status_label}] ({v.date})")

    return "\n".join(parts)


async def _build_training_context(db: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Build training context: fitness profile, active plan, recent logs."""
    parts = []

    # Fitness profile
    profile = await db.get(FitnessProfile, user_id)
    if profile:
        lines = ["Perfil de fitness:"]
        if profile.experience_level:
            lines.append(f"- Nivel: {profile.experience_level}")
        if profile.training_days_per_week:
            lines.append(f"- Dias/semana: {profile.training_days_per_week}")
        if profile.session_duration_minutes:
            lines.append(f"- Duracion sesion: {profile.session_duration_minutes} min")
        if profile.available_equipment:
            lines.append(f"- Equipo: {', '.join(profile.available_equipment)}")
        if profile.training_goals:
            lines.append(f"- Metas: {', '.join(profile.training_goals)}")
        if profile.injuries_limitations:
            lines.append(f"- Limitaciones: {', '.join(profile.injuries_limitations)}")
        parts.append("\n".join(lines))

    # Active plan
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.user_id == user_id, TrainingPlan.status == "active").limit(1)
    )
    plan = result.scalar_one_or_none()

    if plan:
        # Count completed workouts
        result = await db.execute(
            select(func.count())
            .select_from(WorkoutLog)
            .join(Workout, WorkoutLog.workout_id == Workout.id)
            .where(Workout.plan_id == plan.id)
        )
        completed = result.scalar() or 0

        result = await db.execute(select(func.count()).select_from(Workout).where(Workout.plan_id == plan.id))
        total = result.scalar() or 0

        parts.append(
            f"Plan activo: {plan.name} ({plan.plan_type}, {plan.duration_weeks} semanas) "
            f"— {completed}/{total} sesiones completadas"
        )

        # Upcoming workouts (next 5 without logs)
        result = await db.execute(
            select(Workout)
            .outerjoin(WorkoutLog, WorkoutLog.workout_id == Workout.id)
            .where(Workout.plan_id == plan.id, WorkoutLog.id.is_(None))
            .order_by(Workout.week_number, Workout.day_of_week)
            .limit(5)
        )
        upcoming = result.scalars().all()
        if upcoming:
            lines = ["Proximos workouts:"]
            for w in upcoming:
                lines.append(f"- Sem {w.week_number}, Dia {w.day_of_week}: {w.name} ({w.workout_type}) [id:{w.id}]")
            parts.append("\n".join(lines))

    # Recent logs (last 5)
    result = await db.execute(
        select(WorkoutLog).where(WorkoutLog.user_id == user_id).order_by(WorkoutLog.completed_at.desc()).limit(5)
    )
    logs = result.scalars().all()
    if logs:
        lines = ["Ultimos registros de workout:"]
        for log in logs:
            mood_str = f", animo: {log.mood}" if log.mood else ""
            lines.append(
                f"- RPE: {log.perceived_effort}/10, completo: {'si' if log.completed_fully else 'no'}{mood_str}"
            )
        parts.append("\n".join(lines))

    return "\n\n".join(parts) if parts else None


async def build_context(
    db: AsyncSession,
    user: User,
    conversation_id: uuid.UUID,
) -> tuple[str, list[dict[str, str]]]:
    """Assemble the full context for a Claude API call.

    Returns (system_prompt, messages) ready for the API.
    """
    system_prompt = get_system_prompt(user.language)

    # Add user profile context
    profile = await db.get(UserHealthProfile, user.id)
    profile_text = _build_profile_context(user, profile)
    system_prompt += f"\n\n## Perfil del Usuario\n{profile_text}"

    # Add wearable data context
    wearable_text = await _build_wearable_context(db, user.id)
    if wearable_text:
        system_prompt += f"\n\n## Datos de Wearable\n{wearable_text}"

    # Add lab results context
    lab_text = await _build_lab_context(db, user.id)
    if lab_text:
        system_prompt += f"\n\n## Resultados de Laboratorio\n{lab_text}"

    # Add training context
    training_text = await _build_training_context(db, user.id)
    if training_text:
        system_prompt += f"\n\n## Entrenamiento\n{training_text}"

    # Get conversation history
    messages = await _get_conversation_history(db, conversation_id)

    return system_prompt, messages


async def stream_response(
    db: AsyncSession,
    user: User,
    conversation: Conversation,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream a Claude response with tool use support.

    Yields JSON-wrapped SSE events:
    - {"type":"text","content":"..."} for text chunks
    - {"type":"tool_status","tool":"...","status":"running"} when tool starts
    - {"type":"tool_result","tool":"...","summary":"..."} when tool completes

    Handles multi-turn tool use: Claude can call tools mid-response, we execute
    them server-side and continue the conversation until Claude stops.
    """
    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    await db.commit()

    # Build context
    system_prompt, history = await build_context(db, user, conversation.id)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    full_response_text = ""
    messages = list(history)

    for _round in range(MAX_TOOL_ROUNDS):
        # Collect the full response (text + tool_use blocks)
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=TOOL_DEFINITIONS,
        )

        # Process each content block
        tool_results = []
        for block in response.content:
            if block.type == "text":
                full_response_text += block.text
                yield json.dumps({"type": "text", "content": block.text})

            elif block.type == "tool_use":
                # Signal tool execution to frontend
                yield json.dumps(
                    {
                        "type": "tool_status",
                        "tool": block.name,
                        "status": "running",
                    }
                )

                # Execute tool
                result_str = await execute_tool(block.name, block.input, db, user)

                yield json.dumps(
                    {
                        "type": "tool_result",
                        "tool": block.name,
                        "summary": result_str,
                    }
                )

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    }
                )

        # If Claude didn't call any tools, we're done
        if response.stop_reason != "tool_use":
            break

        # Continue conversation with tool results
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    # Save assistant response (text portions only)
    if full_response_text:
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_response_text,
        )
        db.add(assistant_msg)

    # Update conversation title from first exchange if not set
    if conversation.title is None and full_response_text:
        conversation.title = user_message[:100]

    await db.commit()
