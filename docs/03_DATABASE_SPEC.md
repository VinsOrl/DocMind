# Database Spec — SQLite + ChromaDB

---

## 1. SQLite Schema (via SQLAlchemy)

### `app/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # needed for SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 2. SQLAlchemy Models

### `models/user.py`
```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="owner", cascade="all, delete")
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete")
```

### `models/document.py`
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # File info
    original_name = Column(String, nullable=False)     # "Research Paper.pdf"
    filename = Column(String, nullable=False)           # stored file name (uuid-based)
    file_size = Column(Integer)                        # bytes

    # Processing info
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    status = Column(
        Enum("pending", "processing", "ready", "failed", name="doc_status"),
        default="pending"
    )
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="documents")
    sessions = relationship("ChatSession", back_populates="document", cascade="all, delete")
```

### `models/session.py`
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    title = Column(String, default="New Chat")      # auto-generated from first question
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")
    document = relationship("Document", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete",
                            order_by="Message.created_at")
```

### `models/message.py`
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sources = Column(Text)           # JSON string of source chunks
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
```

---

## 3. Pydantic Schemas

### `schemas/user.py`
```python
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
```

### `schemas/document.py`
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    original_name: str
    page_count: int
    chunk_count: int
    status: str
    file_size: Optional[int]
    created_at: datetime
    processed_at: Optional[datetime]
    session_count: int = 0

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
```

### `schemas/chat.py`
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AskRequest(BaseModel):
    question: str

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
```

---

## 4. ChromaDB Collections

ChromaDB stores vector embeddings. One **collection per document**.

### Collection Naming
```
collection name: "doc_{document_id}"
example: "doc_1", "doc_42"
```

### Document Schema in ChromaDB
Each chunk stored as:
```
{
    "id": "doc_1_chunk_0",        # unique chunk ID
    "embedding": [0.12, ...],     # 384-dim float vector (MiniLM)
    "document": "chunk text...",  # raw text
    "metadata": {
        "page": 3,                # source page number
        "chunk_idx": 0,           # order in document
        "document_id": 1          # FK to SQLite documents table
    }
}
```

### Query Results Shape
```python
{
    "ids": [["doc_1_chunk_42", "doc_1_chunk_43"]],       # top k results
    "documents": [["text of chunk 42", "text of 43"]],
    "metadatas": [[{"page": 18, "chunk_idx": 42}, ...]],
    "distances": [[0.09, 0.13]]   # cosine distance (lower = more similar)
}
```

Similarity score = `1 - distance` (cosine distance → cosine similarity).

---

## 5. Data Flow Summary

```
PDF Upload
    │
    ▼
SQLite: INSERT documents (status='processing')
    │
    ▼
Background Task:
    1. PyMuPDF → extract text per page
    2. TextChunker → list of {text, page, chunk_idx}
    3. Embedder → list of 384-dim vectors
    4. ChromaDB: add to collection "doc_{id}"
    5. SQLite: UPDATE documents SET status='ready', chunk_count=N
    │
    ▼
Ask Question
    │
    ▼
Embedder → query vector
    │
    ▼
ChromaDB: query "doc_{id}" → top 4 chunks
    │
    ▼
LLM: generate answer from chunks
    │
    ▼
SQLite: INSERT messages (question, answer, sources JSON)
    │
    ▼
Return AskResponse to frontend
```
