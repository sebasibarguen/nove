# ABOUTME: AI coach service handling context assembly and Claude API streaming.
# ABOUTME: Builds conversation context from user profile + history, streams responses.

import uuid
from collections.abc import AsyncGenerator
from datetime import date

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.coach.models import Conversation, Message
from nove.coach.prompts import get_system_prompt
from nove.config import settings
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
