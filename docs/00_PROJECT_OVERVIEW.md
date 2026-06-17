# DocMind — Document Q&A System (RAG)
> Full-Stack Final Project Spec | Read this file first before touching any code.

---

## 🧠 What is This?

**DocMind** is a full-stack web application that lets users upload PDF documents and ask natural language questions about them. It uses a **RAG (Retrieval-Augmented Generation)** pipeline to find relevant chunks of the document and feed them to an LLM to generate accurate, grounded answers.

---

## 📁 Spec Files Index

| File | What it covers |
|------|---------------|
| `00_PROJECT_OVERVIEW.md` | This file — architecture, tech stack, folder structure |
| `01_BACKEND_SPEC.md` | FastAPI backend, RAG pipeline, all API endpoints |
| `02_FRONTEND_SPEC.md` | React frontend, all pages, components, UI/UX |
| `03_DATABASE_SPEC.md` | ChromaDB vector store + SQLite schema |
| `04_RAG_PIPELINE_SPEC.md` | Deep dive into RAG logic (chunking, embedding, retrieval) |
| `05_DEPLOYMENT_SPEC.md` | Docker setup, cloud deployment (Render/Railway) |
| `06_TASKS_CHECKLIST.md` | Step-by-step build order + completion checklist |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  Upload Page → Document List → Chat Interface → History     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│                                                              │
│   /upload ──► PDF Parser ──► Text Chunker ──► Embedder      │
│                                                    │         │
│   /ask ──► Query Embedder ──► Vector Search ◄──────┘        │
│                │                    │                        │
│                │              ChromaDB                       │
│                ▼                                             │
│           LLM (Ollama / OpenAI) ──► Answer                  │
│                                                              │
│   SQLite: documents, sessions, chat_history                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Web Framework | FastAPI + Uvicorn |
| PDF Parsing | PyMuPDF (`fitz`) |
| Text Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Vector Store | ChromaDB (local persistent) |
| LLM | Ollama (local, port 11434) — models: `gemma3:latest` or `qwen2.5:latest` |
| Database | SQLite via `SQLAlchemy` |
| Auth | JWT (python-jose) |
| File Storage | Local disk (`/uploads` directory) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| HTTP Client | Axios |
| UI Components | shadcn/ui |
| File Upload | react-dropzone |
| Markdown Render | react-markdown |
| Charts | Recharts |

### DevOps
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Local dev + deployment |
| Render.com | Cloud hosting (free tier) |
| GitHub | Version control |

---

## 📂 Project Folder Structure

```
docmind/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── config.py             # Settings (env vars)
│   │   ├── database.py           # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── document.py       # SQLAlchemy models
│   │   │   ├── session.py
│   │   │   └── message.py
│   │   ├── schemas/
│   │   │   ├── document.py       # Pydantic schemas
│   │   │   ├── chat.py
│   │   │   └── user.py
│   │   ├── routers/
│   │   │   ├── documents.py      # /documents endpoints
│   │   │   ├── chat.py           # /chat endpoints
│   │   │   └── auth.py           # /auth endpoints
│   │   ├── services/
│   │   │   ├── pdf_parser.py     # PDF → raw text
│   │   │   ├── chunker.py        # text → chunks
│   │   │   ├── embedder.py       # chunks → vectors
│   │   │   ├── vector_store.py   # ChromaDB interface
│   │   │   ├── retriever.py      # semantic search
│   │   │   └── llm.py            # LLM call + prompt
│   │   └── utils/
│   │       ├── auth.py           # JWT helpers
│   │       └── file_handler.py   # upload/delete files
│   ├── uploads/                  # uploaded PDFs stored here
│   ├── chroma_db/                # ChromaDB persistent data
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx   # document list
│   │   │   ├── UploadPage.jsx
│   │   │   └── ChatPage.jsx        # main Q&A interface
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── document/
│   │   │   │   ├── DocumentCard.jsx
│   │   │   │   ├── DocumentList.jsx
│   │   │   │   └── UploadDropzone.jsx
│   │   │   └── chat/
│   │   │       ├── ChatWindow.jsx
│   │   │       ├── MessageBubble.jsx
│   │   │       ├── SourceCard.jsx     # shows retrieved chunks
│   │   │       └── ChatInput.jsx
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   └── documentStore.js
│   │   ├── api/
│   │   │   └── client.js           # Axios instance + interceptors
│   │   └── hooks/
│   │       └── useChat.js
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## 🌟 Key Features

1. **PDF Upload** — drag & drop, progress bar, file validation
2. **RAG Pipeline** — automatic chunking + embedding on upload
3. **Semantic Search** — finds the most relevant chunks for each question
4. **Cited Answers** — AI answer includes source chunks it used
5. **Multi-document** — user can manage multiple PDFs
6. **Chat History** — all Q&A sessions saved per document
7. **User Auth** — register/login with JWT
8. **Responsive UI** — works on desktop and mobile

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# LLM — Ollama running locally on port 11434 (always)
OLLAMA_BASE_URL=http://localhost:11434

# Choose ONE model (pull first with: ollama pull <model>)
# Option A — Google Gemma (lightweight, fast, good for English)
OLLAMA_MODEL=gemma3:latest
# Option B — Alibaba Qwen (multilingual: EN + ZH + ID, more capable)
# OLLAMA_MODEL=qwen2.5:latest

# Embeddings (always local)
EMBEDDING_MODEL=all-MiniLM-L6-v2

# App
SECRET_KEY=your-super-secret-key-change-this
DATABASE_URL=sqlite:///./docmind.db
UPLOAD_DIR=./uploads
CHROMA_DIR=./chroma_db

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Quick Start (Development)

```bash
# 1. Clone and set up
git clone <your-repo>
cd docmind

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
# → opens at http://localhost:5173

# 4. Ollama — pull your chosen model (pick one)
ollama pull gemma3       # Option A: Google Gemma (lightweight)
ollama pull qwen2.5      # Option B: Alibaba Qwen (multilingual)
ollama serve             # starts on http://localhost:11434
```

---

## 📊 Grading Criteria Alignment

| Criterion | How it's covered |
|-----------|-----------------|
| Full-stack architecture | React frontend + FastAPI backend |
| Database usage | SQLite (metadata) + ChromaDB (vectors) |
| Complex backend logic | RAG pipeline (chunking, embedding, retrieval) |
| API design | RESTful endpoints with proper status codes |
| Authentication | JWT-based auth |
| Cloud deployment | Render.com with live URL |
| Code quality | Type hints, Pydantic schemas, modular services |
| UI/UX | Responsive Tailwind UI with proper feedback |
