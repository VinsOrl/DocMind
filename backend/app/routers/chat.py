import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.message import Message
from app.models.session import ChatSession
from app.models.user import User
from app.schemas.chat import (
    AskRequest,
    AskResponse,
    CreateSessionRequest,
    MessageResponse,
    SessionDetailResponse,
    SessionResponse,
    SourceChunk,
)
from app.services.embedder import embedder
from app.services.llm import llm_service
from app.services.vector_store import vector_store
from app.utils.auth import get_current_user

router = APIRouter()


def _get_session_or_404(session_id: int, user_id: int, db: Session) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(404, "Session not found")
    return session


def _parse_sources(raw: str | None) -> list[SourceChunk]:
    if not raw:
        return []
    return [SourceChunk(**s) for s in json.loads(raw)]


@router.post("/sessions", response_model=SessionResponse)
def create_session(
    body: CreateSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.id == body.document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(404, "Document not found")

    session = ChatSession(
        user_id=current_user.id, document_id=body.document_id, title=body.title
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    out = []
    for s in sessions:
        resp = SessionResponse.model_validate(s)
        resp.message_count = len(s.messages)
        out.append(resp)
    return out


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, current_user.id, db)
    messages = [
        MessageResponse(
            id=m.id,
            question=m.question,
            answer=m.answer,
            sources=_parse_sources(m.sources),
            created_at=m.created_at,
        )
        for m in session.messages
    ]
    return SessionDetailResponse(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        message_count=len(messages),
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages,
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, current_user.id, db)
    db.delete(session)
    db.commit()


@router.post("/sessions/{session_id}/ask", response_model=AskResponse)
def ask_question(
    session_id: int,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, current_user.id, db)

    # 1. Embed the question
    query_vector = embedder.embed_query(body.question)

    # 2. Retrieve top-k relevant chunks
    results = vector_store.query(session.document_id, query_vector, n_results=4)

    ids = results.get("ids", [[]])[0]
    if not ids:
        raise HTTPException(
            400, "Document has no indexed content yet. Is it still processing?"
        )

    # 3. Format context chunks
    chunks = [
        {
            "chunk_id": ids[i],
            "text": results["documents"][0][i],
            "page": results["metadatas"][0][i]["page"],
            "similarity_score": round(1 - results["distances"][0][i], 3),
        }
        for i in range(len(ids))
    ]

    # 4. Generate answer from LLM
    try:
        answer = llm_service.generate_answer(body.question, chunks)
    except RuntimeError as exc:
        raise HTTPException(504, str(exc))

    # 5. Save to chat history
    message = Message(
        session_id=session_id,
        question=body.question,
        answer=answer,
        sources=json.dumps(chunks),
    )
    db.add(message)
    # Auto-name the session from the first question
    if session.title == "New Chat" and not session.messages:
        session.title = body.question[:60]
    db.commit()
    db.refresh(message)

    return AskResponse(
        question=body.question,
        answer=answer,
        sources=[SourceChunk(**c) for c in chunks],
        session_id=session_id,
        message_id=message.id,
        created_at=message.created_at,
    )
