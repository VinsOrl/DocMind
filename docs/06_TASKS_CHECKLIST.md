# Build Checklist — Step-by-Step for Claude Code

> Give this file to Claude Code and say: "Follow this checklist in order. Complete each phase before moving to the next."

---

## Phase 0 — Project Scaffold

- [ ] Create root `docmind/` folder
- [ ] Create `backend/` and `frontend/` subdirectories
- [ ] Create `.env.example` with all required variables (see `00_PROJECT_OVERVIEW.md`)
- [ ] Initialize git repo: `git init`
- [ ] Create `.gitignore` (ignore: `venv/`, `node_modules/`, `*.db`, `uploads/`, `chroma_db/`, `.env`)

---

## Phase 1 — Backend Foundation

### 1.1 Python Environment
- [ ] Create `backend/requirements.txt` (copy from `01_BACKEND_SPEC.md`)
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Install dependencies: `pip install -r requirements.txt`

### 1.2 Config & Database
- [ ] Create `backend/app/__init__.py`
- [ ] Create `backend/app/config.py` (Settings class with pydantic-settings)
- [ ] Create `backend/app/database.py` (SQLAlchemy setup, `get_db` dependency)

### 1.3 SQLAlchemy Models
- [ ] Create `backend/app/models/__init__.py`
- [ ] Create `backend/app/models/user.py`
- [ ] Create `backend/app/models/document.py`
- [ ] Create `backend/app/models/session.py`
- [ ] Create `backend/app/models/message.py`

### 1.4 Pydantic Schemas
- [ ] Create `backend/app/schemas/__init__.py`
- [ ] Create `backend/app/schemas/user.py`
- [ ] Create `backend/app/schemas/document.py`
- [ ] Create `backend/app/schemas/chat.py`

### 1.5 Auth Utilities
- [ ] Create `backend/app/utils/__init__.py`
- [ ] Create `backend/app/utils/auth.py`:
  - `hash_password(password)` using passlib bcrypt
  - `verify_password(plain, hashed)`
  - `create_access_token(data, expires_delta)` using python-jose
  - `get_current_user(token, db)` dependency

### 1.6 File Handler Utility
- [ ] Create `backend/app/utils/file_handler.py`:
  - `save_upload(file: UploadFile) -> Path` — saves to `uploads/` with UUID name
  - `delete_file(filename: str)` — removes from disk

---

## Phase 2 — RAG Pipeline Services

- [ ] Create `backend/app/services/__init__.py`

### 2.1 PDF Parser
- [ ] Create `backend/app/services/pdf_parser.py`
  - Uses PyMuPDF (`fitz`)
  - `extract_text(file_path) -> {full_text, pages, page_count}`
  - Test: parse a sample PDF and print page count

### 2.2 Text Chunker
- [ ] Create `backend/app/services/chunker.py`
  - Uses `langchain_text_splitters.RecursiveCharacterTextSplitter`
  - `chunk_pages(pages) -> list[{chunk_idx, text, page}]`
  - chunk_size=512, chunk_overlap=64
  - Test: chunk a 3-page document, verify overlap

### 2.3 Embedder
- [ ] Create `backend/app/services/embedder.py`
  - Loads `all-MiniLM-L6-v2` via SentenceTransformer
  - `embed_texts(texts) -> list[list[float]]`
  - `embed_query(query) -> list[float]`
  - Singleton pattern (load once)
  - Test: embed a sentence, verify output shape is (384,)

### 2.4 Vector Store
- [ ] Create `backend/app/services/vector_store.py`
  - ChromaDB PersistentClient
  - `add_chunks(document_id, chunks, embeddings)`
  - `query(document_id, query_embedding, n_results=4) -> results`
  - `delete_collection(document_id)`
  - Test: add 5 chunks, query for 2, verify results returned

### 2.5 LLM Service
- [ ] Create `backend/app/services/llm.py`
  - `generate_answer(question, context_chunks) -> str`
  - Always calls local Ollama at `http://localhost:11434`
  - Configurable model via `OLLAMA_MODEL` env var
  - Default model: `gemma3:latest` (or switch to `qwen2.5:latest`)
  - RAG prompt template (see `04_RAG_PIPELINE_SPEC.md`)
  - Test: `ollama pull gemma3 && ollama serve` first, then test with fake chunks

---

## Phase 3 — API Routers

### 3.1 Auth Router
- [ ] Create `backend/app/routers/auth.py`
  - `POST /auth/register` — create user, hash password, return UserResponse
  - `POST /auth/login` — verify password, return JWT token
  - `GET /auth/me` — return current user (requires auth)
  - Test: register → login → verify token works

### 3.2 Documents Router
- [ ] Create `backend/app/routers/documents.py`
  - `POST /documents/upload` — accept PDF, save to disk, create DB record, trigger background task
  - `GET /documents` — return user's document list
  - `GET /documents/{id}` — return single document
  - `DELETE /documents/{id}` — delete file + ChromaDB collection + DB record
  - `GET /documents/{id}/status` — return just the status field
  - Background task: `process_document(doc_id, file_path, db)` (see `04_RAG_PIPELINE_SPEC.md`)

### 3.3 Chat Router
- [ ] Create `backend/app/routers/chat.py`
  - `POST /chat/sessions` — create new session for a document
  - `GET /chat/sessions` — list all user sessions (with doc name, message count)
  - `GET /chat/sessions/{id}` — session detail with full message history
  - `DELETE /chat/sessions/{id}` — delete session and messages
  - `POST /chat/sessions/{id}/ask` — the main RAG endpoint (see `01_BACKEND_SPEC.md`)
    1. Embed question
    2. Query ChromaDB
    3. Call LLM
    4. Save message to DB
    5. Return answer + sources

### 3.4 Main App
- [ ] Create `backend/app/main.py` — wire up all routers, CORS, startup event
- [ ] Test: `uvicorn app.main:app --reload` runs without errors
- [ ] Test: visit `http://localhost:8000/docs` — all endpoints visible

---

## Phase 4 — Frontend Foundation

### 4.1 Vite + React Setup
- [ ] Scaffold: `npm create vite@latest frontend -- --template react`
- [ ] Install all dependencies (see `02_FRONTEND_SPEC.md`)
- [ ] Configure Tailwind CSS
- [ ] Set up `src/api/client.js` with Axios + auth interceptors

### 4.2 Auth Store + Pages
- [ ] Create `src/store/authStore.js` (Zustand)
- [ ] Create `src/pages/LoginPage.jsx`
- [ ] Create `src/pages/RegisterPage.jsx`
- [ ] Create `src/components/layout/ProtectedLayout.jsx` (redirect if no token)
- [ ] Wire up React Router in `App.jsx`
- [ ] Test: can register, login, and get redirected to dashboard

### 4.3 Document Store + Dashboard
- [ ] Create `src/store/documentStore.js`
- [ ] Create `src/components/document/DocumentCard.jsx`
- [ ] Create `src/components/document/DocumentList.jsx`
- [ ] Create `src/pages/DashboardPage.jsx`
- [ ] Test: dashboard loads and shows empty state

### 4.4 Upload Page
- [ ] Create `src/components/document/UploadDropzone.jsx`
- [ ] Create `src/pages/UploadPage.jsx`
- [ ] Implement: drag & drop → file preview → upload → progress bar → redirect
- [ ] Poll document status until `ready`
- [ ] Test: upload a PDF, see it appear on dashboard with "ready" status

### 4.5 Chat Interface
- [ ] Create `src/components/chat/ChatInput.jsx`
- [ ] Create `src/components/chat/MessageBubble.jsx`
- [ ] Create `src/components/chat/SourceCard.jsx`
- [ ] Create `src/components/chat/ChatWindow.jsx`
- [ ] Create `src/pages/ChatPage.jsx` with sidebar + main layout
- [ ] Implement: ask question → show user bubble → show loading → show AI answer + sources
- [ ] Test: ask "What is this document about?" and get a real answer

### 4.6 Navbar & Layout
- [ ] Create `src/components/layout/Navbar.jsx` (logo, username, logout)
- [ ] Wire Navbar into ProtectedLayout

---

## Phase 5 — Integration Testing

- [ ] Register a new user
- [ ] Upload a real PDF (research paper, textbook chapter, etc.)
- [ ] Verify document appears with `ready` status
- [ ] Start a chat session
- [ ] Ask at least 3 questions, verify answers reference document content
- [ ] Verify source chunks are shown with page numbers
- [ ] Delete the document, verify it's removed from list
- [ ] Verify chat history persists after page refresh (reload session from API)
- [ ] Test with a scanned PDF — verify graceful error

---

## Phase 6 — Docker

- [ ] Create `backend/Dockerfile`
- [ ] Create `frontend/Dockerfile`
- [ ] Create `frontend/nginx.conf`
- [ ] Create `docker-compose.yml`
- [ ] Test: `docker compose up --build` — both services start
- [ ] Test: visit `http://localhost:5173` in browser, full app works via Docker

---

## Phase 7 — Deployment

- [ ] Push code to GitHub
- [ ] Deploy backend to Render.com (Web Service, Python)
- [ ] Set all environment variables in Render dashboard
- [ ] Deploy frontend to Render.com (Static Site)
- [ ] Update backend `FRONTEND_URL` to production frontend URL
- [ ] Run full smoke test on production URL
- [ ] Copy live URL for submission

---

## Final Deliverables Checklist

- [ ] `README.md` with live URL, tech stack, setup instructions
- [ ] Live backend URL: `https://______.onrender.com`
- [ ] Live frontend URL: `https://______.onrender.com`
- [ ] API docs URL: `https://______.onrender.com/docs`
- [ ] All spec files committed to repo under `docs/` folder
- [ ] At least 10 git commits showing development progress

---

## 🎯 Claude Code Prompt to Get Started

Copy and paste this into Claude Code:

```
I'm building a full-stack Document Q&A System using RAG (Retrieval-Augmented Generation) for my university final project.

Key constraint: LLM is ALWAYS local Ollama running at http://localhost:11434
- Default model: gemma3:latest  (alternative: qwen2.5:latest)
- NO OpenAI, NO cloud LLM API keys needed
- Embeddings also run locally via sentence-transformers

Read these spec files in order before writing any code:
1. 00_PROJECT_OVERVIEW.md
2. 01_BACKEND_SPEC.md
3. 02_FRONTEND_SPEC.md
4. 03_DATABASE_SPEC.md
5. 04_RAG_PIPELINE_SPEC.md
6. 05_DEPLOYMENT_SPEC.md
7. 06_TASKS_CHECKLIST.md

Then start from Phase 0 of the checklist and work through Phase 3 (complete backend first).
Create all files exactly as specified. After each phase, confirm it works before moving on.
Ask me if anything is unclear before writing code.
```
