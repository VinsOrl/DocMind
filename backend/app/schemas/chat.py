from datetime import datetime

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class CreateSessionRequest(BaseModel):
    document_id: int
    title: str = "New Chat"


class SourceChunk(BaseModel):
    chunk_id: str
    text: str
    page: int
    similarity_score: float


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceChunk]
    session_id: int
    message_id: int
    created_at: datetime


class MessageResponse(BaseModel):
    id: int
    question: str
    answer: str
    sources: list[SourceChunk]
    created_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: int
    document_id: int
    title: str
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    messages: list[MessageResponse]
