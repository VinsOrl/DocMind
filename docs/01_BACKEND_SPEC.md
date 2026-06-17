# Backend Spec — FastAPI + RAG Pipeline

---

## 1. Entry Point: `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents, chat, auth
from app.database import create_tables
from app.config import settings

app = FastAPI(title="DocMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    create_tables()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

---

## 2. Configuration: `app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM — always Ollama, never OpenAI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:latest"   # or "qwen2.5:latest"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    SECRET_KEY: str = "change-me"
    DATABASE_URL: str = "sqlite:///./docmind.db"
    UPLOAD_DIR: str = "./uploads"
    CHROMA_DIR: str = "./chroma_db"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 3. API Endpoints

### Auth Endpoints — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create new account |
| POST | `/auth/login` | No | Returns JWT token |
| GET | `/auth/me` | Yes | Get current user info |

**Register Request:**
```json
{
  "username": "mate",
  "email": "mate@example.com",
  "password": "securepassword"
}
```

**Login Request:**
```json
{
  "email": "mate@example.com",
  "password": "securepassword"
}
```

**Login Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "mate",
    "email": "mate@example.com"
  }
}
```

---

### Document Endpoints — `/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/documents/upload` | Yes | Upload + process PDF |
| GET | `/documents` | Yes | List user's documents |
| GET | `/documents/{id}` | Yes | Get single document details |
| DELETE | `/documents/{id}` | Yes | Delete document + vectors |
| GET | `/documents/{id}/status` | Yes | Get processing status |

**Upload Response:**
```json
{
  "id": 1,
  "filename": "research_paper.pdf",
  "original_name": "Research Paper.pdf",
  "page_count": 24,
  "chunk_count": 87,
  "status": "processing",
  "created_at": "2025-06-16T10:30:00Z"
}
```

**Document List Response:**
```json
{
  "documents": [
    {
      "id": 1,
      "original_name": "Research Paper.pdf",
      "page_count": 24,
      "chunk_count": 87,
      "status": "ready",
      "created_at": "2025-06-16T10:30:00Z",
      "session_count": 3
    }
  ],
  "total": 1
}
```

---

### Chat Endpoints — `/chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/sessions` | Yes | Create new chat session for a document |
| GET | `/chat/sessions` | Yes | List all user's chat sessions |
| GET | `/chat/sessions/{id}` | Yes | Get session with full message history |
| DELETE | `/chat/sessions/{id}` | Yes | Delete session |
| POST | `/chat/sessions/{id}/ask` | Yes | Ask a question (main RAG endpoint) |

**Ask Request:**
```json
{
  "question": "What is the main conclusion of this paper?"
}
```

**Ask Response:**
```json
{
  "question": "What is the main conclusion of this paper?",
  "answer": "According to the document, the main conclusion is that...",
  "sources": [
    {
      "chunk_id": "doc_1_chunk_42",
      "text": "...relevant excerpt from the document...",
      "page": 18,
      "similarity_score": 0.91
    },
    {
      "chunk_id": "doc_1_chunk_43",
      "text": "...another relevant excerpt...",
      "page": 19,
      "similarity_score": 0.87
    }
  ],
  "session_id": 1,
  "message_id": 7,
  "created_at": "2025-06-16T10:35:00Z"
}
```

---

## 4. Services

### `services/pdf_parser.py`

```python
import fitz  # PyMuPDF

class PDFParser:
    def extract_text(self, file_path: str) -> dict:
        """
        Returns:
          {
            "full_text": str,
            "pages": [{"page_num": 1, "text": "..."}],
            "page_count": int
          }
        """
        doc = fitz.open(file_path)
        pages = []
        full_text = ""

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text")
            pages.append({"page_num": page_num, "text": text})
            full_text += f"\n[PAGE {page_num}]\n{text}"

        doc.close()
        return {
            "full_text": full_text,
            "pages": pages,
            "page_count": len(pages)
        }
```

---

### `services/chunker.py`

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

class TextChunker:
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def chunk_pages(self, pages: list[dict]) -> list[dict]:
        """
        Input: [{"page_num": 1, "text": "..."}]
        Output: [{"chunk_id": "doc_1_chunk_0", "text": "...", "page": 1}]
        """
        chunks = []
        chunk_idx = 0
        for page in pages:
            page_chunks = self.splitter.split_text(page["text"])
            for chunk_text in page_chunks:
                if chunk_text.strip():
                    chunks.append({
                        "chunk_idx": chunk_idx,
                        "text": chunk_text.strip(),
                        "page": page["page_num"]
                    })
                    chunk_idx += 1
        return chunks
```

---

### `services/embedder.py`

```python
from sentence_transformers import SentenceTransformer
from app.config import settings

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts, show_progress_bar=False).tolist()

    def embed_query(self, query: str) -> list[float]:
        return self.model.encode(query).tolist()

# Singleton instance
embedder = Embedder()
```

---

### `services/vector_store.py`

```python
import chromadb
from app.config import settings

class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DIR)

    def get_or_create_collection(self, collection_name: str):
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, document_id: int, chunks: list[dict], embeddings: list):
        collection = self.get_or_create_collection(f"doc_{document_id}")
        collection.add(
            ids=[f"doc_{document_id}_chunk_{c['chunk_idx']}" for c in chunks],
            embeddings=embeddings,
            documents=[c["text"] for c in chunks],
            metadatas=[{"page": c["page"], "chunk_idx": c["chunk_idx"]} for c in chunks]
        )

    def query(self, document_id: int, query_embedding: list, n_results: int = 4):
        collection = self.get_or_create_collection(f"doc_{document_id}")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
        return results

    def delete_collection(self, document_id: int):
        try:
            self.client.delete_collection(f"doc_{document_id}")
        except Exception:
            pass

vector_store = VectorStore()
```

---

### `services/llm.py`

```python
import httpx
from app.config import settings

RAG_PROMPT_TEMPLATE = """You are a helpful assistant that answers questions based strictly on the provided document context.

CONTEXT FROM DOCUMENT:
{context}

QUESTION: {question}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say "I couldn't find this in the document"
- Be concise and accurate
- Cite which part of the document your answer comes from

ANSWER:"""

class LLMService:
    def generate_answer(self, question: str, context_chunks: list[dict]) -> str:
        context = "\n\n---\n\n".join([
            f"[Page {c['page']}]: {c['text']}" for c in context_chunks
        ])
        prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question)
        return self._call_ollama(prompt)

    def _call_ollama(self, prompt: str) -> str:
        """
        Calls local Ollama at port 11434.
        Supported models:
          - gemma3:latest       (Google Gemma, fast, English-focused)
          - qwen2.5:latest      (Alibaba Qwen, multilingual EN/ZH/ID)
        Pull first: ollama pull gemma3  OR  ollama pull qwen2.5
        """
        response = httpx.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 1024
                }
            },
            timeout=120.0   # Ollama can be slow on first run (model load)
        )
        response.raise_for_status()
        return response.json()["response"]

llm_service = LLMService()
```

---

## 5. Router Implementations

### `routers/documents.py` — Upload Flow

```python
@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    # 2. Save file to disk
    file_path = await file_handler.save_upload(file)

    # 3. Create DB record
    doc = Document(
        user_id=current_user.id,
        original_name=file.filename,
        filename=file_path.name,
        status="processing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 4. Process in background (parse → chunk → embed → store)
    background_tasks.add_task(process_document, doc.id, str(file_path), db)

    return doc
```

### `routers/chat.py` — Ask Flow

```python
@router.post("/sessions/{session_id}/ask", response_model=AskResponse)
async def ask_question(
    session_id: int,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify session belongs to user
    session = get_session_or_404(session_id, current_user.id, db)

    # 2. Embed the question
    query_vector = embedder.embed_query(body.question)

    # 3. Retrieve top-k relevant chunks
    results = vector_store.query(session.document_id, query_vector, n_results=4)

    # 4. Format context chunks
    chunks = [
        {
            "chunk_id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "page": results["metadatas"][0][i]["page"],
            "similarity_score": round(1 - results["distances"][0][i], 3)
        }
        for i in range(len(results["ids"][0]))
    ]

    # 5. Generate answer from LLM
    answer = llm_service.generate_answer(body.question, chunks)

    # 6. Save to chat history
    message = Message(
        session_id=session_id,
        question=body.question,
        answer=answer,
        sources=json.dumps(chunks)
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return AskResponse(
        question=body.question,
        answer=answer,
        sources=chunks,
        session_id=session_id,
        message_id=message.id,
        created_at=message.created_at
    )
```

---

## 6. `requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic-settings==2.3.0
sqlalchemy==2.0.30
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
PyMuPDF==1.24.0
langchain-text-splitters==0.2.0
sentence-transformers==3.0.0
chromadb==0.5.0
httpx==0.27.0
aiofiles==23.2.1

# Note: No openai package needed — LLM runs via local Ollama at port 11434
# Supported models: gemma3:latest, qwen2.5:latest
# Pull with: ollama pull gemma3   OR   ollama pull qwen2.5
```
