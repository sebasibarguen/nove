# ABOUTME: API endpoints for AI coach conversations and messaging.
# ABOUTME: Handles conversation CRUD and SSE-streamed message responses.

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from nove.coach.models import Conversation, Message
from nove.coach.schemas import ConversationCreate, ConversationRead, MessageCreate, MessageRead
from nove.coach.service import stream_response
from nove.deps import DB, CurrentUser

router = APIRouter(prefix="/conversations", tags=["coach"])


@router.post("", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate, user: CurrentUser, db: DB
) -> ConversationRead:
    conversation = Conversation(
        user_id=user.id,
        title=body.title,
        conversation_type=body.conversation_type,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return ConversationRead.model_validate(conversation)


@router.get("", response_model=list[ConversationRead])
async def list_conversations(user: CurrentUser, db: DB) -> list[ConversationRead]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [ConversationRead.model_validate(c) for c in conversations]


async def _get_user_conversation(
    conversation_id: uuid.UUID, user_id: uuid.UUID, db: DB
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
async def get_messages(conversation_id: uuid.UUID, user: CurrentUser, db: DB) -> list[MessageRead]:
    await _get_user_conversation(conversation_id, user.id, db)

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [MessageRead.model_validate(m) for m in messages]


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID,
    body: MessageCreate,
    user: CurrentUser,
    db: DB,
) -> StreamingResponse:
    conversation = await _get_user_conversation(conversation_id, user.id, db)

    async def event_stream():
        async for chunk in stream_response(db, user, conversation, body.content):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
