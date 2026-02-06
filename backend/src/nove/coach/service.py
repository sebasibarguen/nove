# ABOUTME: AI coach service handling context assembly and Claude API streaming.
# ABOUTME: Builds conversation context from user profile + history, streams responses.

import uuid
from collections.abc import AsyncGenerator
from datetime import date, timedelta

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.coach.models import Conversation, Message
from nove.coach.prompts import get_system_prompt
from nove.config import settings
from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.labs.models import LabBiomarkerValue
from nove.users.models import User, UserHealthProfile

MODEL = "claude-sonnet-4-5-20250929"
MAX_HISTORY_MESSAGES = 50


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


async def _get_conversation_history(
    db: AsyncSession, conversation_id: uuid.UUID
) -> list[dict[str, str]]:
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
        parts.append(
            f"- {v.biomarker_name} ({v.biomarker_code}): {v.value} {v.unit}{ref}"
            f" [{status_label}] ({v.date})"
        )

    return "\n".join(parts)


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

    # Get conversation history
    messages = await _get_conversation_history(db, conversation_id)

    return system_prompt, messages


async def stream_response(
    db: AsyncSession,
    user: User,
    conversation: Conversation,
    user_message: str,
) -> AsyncGenerator[str]:
    """Stream a Claude response for the given user message.

    Saves both the user message and assistant response to the database.
    Yields text chunks as they arrive.
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

    # Call Claude with streaming
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    full_response = ""
    async with client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=history,
    ) as stream:
        async for text in stream.text_stream:
            full_response += text
            yield text

    # Save assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=full_response,
    )
    db.add(assistant_msg)

    # Update conversation title from first exchange if not set
    if conversation.title is None and full_response:
        conversation.title = user_message[:100]

    await db.commit()
