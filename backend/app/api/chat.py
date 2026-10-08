from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.session import get_db
from app.models.notice import ChatConversation, ChatMessage
from app.models.user import User, UserRole
from app.schemas.chat import (
    ChatConversationResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chat_service import ChatProviderUnavailable, answer_student_question

router = APIRouter(prefix="/chat", tags=["chat"])


def _require_student(student: User) -> None:
    if student.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can use the academic assistant")


def _get_owned_conversation(
    db: Session,
    conversation_id: int,
    student: User,
) -> ChatConversation:
    conversation = db.scalar(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.student_id == student.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return conversation


@router.get("/conversations", response_model=list[ChatConversationResponse])
def list_conversations(
    db: Annotated[Session, Depends(get_db)],
    student: Annotated[User, Depends(get_current_user)],
) -> list[ChatConversationResponse]:
    _require_student(student)
    conversations = list(
        db.scalars(
            select(ChatConversation)
            .where(ChatConversation.student_id == student.id)
            .order_by(ChatConversation.updated_at.desc(), ChatConversation.id.desc())
        )
    )
    results: list[ChatConversationResponse] = []
    for conversation in conversations:
        latest_message = db.scalar(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation.id)
            .order_by(ChatMessage.id.desc())
            .limit(1)
        )
        results.append(
            ChatConversationResponse(
                id=conversation.id,
                title=conversation.title,
                preview=latest_message.content[:140] if latest_message else "",
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
            )
        )
    return results


@router.post(
    "/conversations",
    response_model=ChatConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    db: Annotated[Session, Depends(get_db)],
    student: Annotated[User, Depends(get_current_user)],
) -> ChatConversationResponse:
    _require_student(student)
    conversation = ChatConversation(student_id=student.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ChatConversationResponse(
        id=conversation.id,
        title=conversation.title,
        preview="",
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[ChatMessageResponse],
)
def get_conversation_messages(
    conversation_id: int,
    db: Annotated[Session, Depends(get_db)],
    student: Annotated[User, Depends(get_current_user)],
) -> list[ChatMessage]:
    _require_student(student)
    _get_owned_conversation(db, conversation_id, student)
    return list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id)
        )
    )


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    student: Annotated[User, Depends(get_current_user)],
) -> ChatResponse:
    _require_student(student)
    if student.id != payload.student_id:
        raise HTTPException(status_code=403, detail="You can only ask questions as the signed-in student")

    if payload.conversation_id is None:
        conversation = ChatConversation(student_id=student.id)
        db.add(conversation)
        db.flush()
    else:
        conversation = _get_owned_conversation(db, payload.conversation_id, student)

    history_records = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation.id)
            .order_by(ChatMessage.id.desc())
            .limit(10)
        )
    )
    history_records.reverse()
    history = [{"role": message.role, "content": message.content} for message in history_records]

    student_message = ChatMessage(
        conversation_id=conversation.id,
        role="student",
        content=payload.message,
        sources=[],
    )
    db.add(student_message)
    db.commit()
    db.refresh(conversation)

    try:
        answer, sources = answer_student_question(
            db,
            student,
            payload.message,
            conversation_history=history,
        )
    except ChatProviderUnavailable as error:
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if "GEMINI_API_KEY" in str(error)
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(
            status_code=status_code,
            detail=str(error),
        ) from error

    if conversation.title == "New chat":
        conversation.title = payload.message.strip()[:120]
    conversation.updated_at = datetime.now(timezone.utc)
    db.add(
        ChatMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sources=[source.model_dump() for source in sources],
        )
    )
    db.commit()
    return ChatResponse(
        conversation_id=conversation.id,
        answer=answer,
        sources=sources,
    )
