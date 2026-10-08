from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    student_id: int
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: int | None = None


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatSource(BaseModel):
    document_id: int
    filename: str
    notice_id: int | None = None
    document_type: str


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str
    sources: list[ChatSource]


class ChatConversationResponse(BaseModel):
    id: int
    title: str
    preview: str
    created_at: datetime
    updated_at: datetime


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: list[ChatSource]
    created_at: datetime
