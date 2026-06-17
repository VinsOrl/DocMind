from datetime import datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services.chunker import TextChunker
from app.services.embedder import embedder
from app.services.pdf_parser import pdf_parser
from app.services.vector_store import vector_store
from app.utils.auth import get_current_user
from app.utils.file_handler import file_handler

router = APIRouter()


def _to_response(doc: Document) -> DocumentResponse:
    data = DocumentResponse.model_validate(doc)
    data.session_count = len(doc.sessions)
    return data


def process_document(document_id: int, file_path: str):
    """Background task: parse -> chunk -> embed -> store. Uses its own DB session."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return
        doc.status = "processing"
        db.commit()

        result = pdf_parser.extract_text(file_path)
        chunks = TextChunker(chunk_size=512, chunk_overlap=64).chunk_pages(
            result["pages"]
        )

        if not chunks:
            raise ValueError(
                "PDF contains no extractable text. Please use a text-based PDF."
            )

        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_texts(texts)
        vector_store.add_chunks(document_id, chunks, embeddings)

        doc.status = "ready"
        doc.page_count = result["page_count"]
        doc.chunk_count = len(chunks)
        doc.processed_at = datetime.utcnow()
        db.commit()
    except Exception as exc:  # noqa: BLE001
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(exc)
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    file_path = await file_handler.save_upload(file)
    file_size = file_path.stat().st_size

    doc = Document(
        user_id=current_user.id,
        original_name=file.filename,
        filename=file_path.name,
        file_size=file_size,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_document, doc.id, str(file_path))
    return _to_response(doc)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return DocumentListResponse(
        documents=[_to_response(d) for d in docs], total=len(docs)
    )


def _get_owned_document(document_id: int, user: User, db: Session) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_response(_get_owned_document(document_id, current_user, db))


@router.get("/{document_id}/status")
def get_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(document_id, current_user, db)
    return {"id": doc.id, "status": doc.status, "error_message": doc.error_message}


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(document_id, current_user, db)
    vector_store.delete_collection(doc.id)
    file_handler.delete_file(doc.filename)
    db.delete(doc)
    db.commit()
