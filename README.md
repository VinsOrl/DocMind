# DocMind — Document Q&A System (RAG)

Upload a PDF, ask questions about it in natural language, and get answers **grounded in the
document** with cited sources and page numbers. DocMind uses a Retrieval-Augmented
Generation (RAG) pipeline: it splits your PDF into chunks, embeds them into a vector
database, retrieves the most relevant pieces for each question, and feeds them to a local
LLM (via [Ollama](https://ollama.com)) to generate an answer.

- **Fully local & private** — your documents, the vector store, and (by default) the LLM all
  run on your machine. No data leaves your computer unless you choose a cloud model.
- **Multilingual** — uses a multilingual embedding model, so you can query documents in many
  languages (English, Chinese, etc.). See [tips](#-tips-for-best-results).
- **Cited answers** — every answer shows the source chunks it used, with page numbers and
  similarity scores.

---

## ✨ Features

- 📄 PDF upload with drag & drop and live processing status
- 🧠 RAG pipeline: chunking → embedding → semantic retrieval → grounded generation
- 🔎 Source citations (page number + similarity score) on every answer
- 💬 Multiple chat sessions per document, with saved history
- 👤 User accounts with JWT auth (bcrypt-hashed passwords, per-account data isolation)
- 🎨 Warm, filmic dark UI (React + Tailwind)
- 🐳 One-command Docker setup, or native install

---

## 🏗️ Tech stack

| Layer | Technology |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, Axios |
| Backend | FastAPI, SQLAlchemy, Uvicorn |
| PDF parsing | PyMuPDF |
| Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Embeddings | `sentence-transformers` → `intfloat/multilingual-e5-base` (local, automatic) |
| Vector store | ChromaDB (local, persistent) |
| LLM | **Ollama** (local) — model is configurable, see [Choosing a model](#-choosing-an-llm-important) |
| Databases | SQLite (metadata) + ChromaDB (vectors) |

---

## 📋 Prerequisites

You need **[Ollama](https://ollama.com/download)** installed and running for the LLM, regardless of
install method. Then either:

- **Docker path:** Docker + Docker Compose
- **Native path:** Python 3.11+ and Node.js 20+

Install Ollama and pull a model (see [Choosing an LLM](#-choosing-an-llm-important) for which one):

```bash
# Example — a good multilingual default:
ollama pull qwen2.5
ollama serve   # usually already running as a service
```

---

## 🚀 Quick start — Docker (recommended)

```bash
git clone https://github.com/VinsOrl/DocMind docmind
cd docmind

# 1. Create the root .env with a strong secret (required — the app refuses to start without one)
echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" > .env

# 2. (Optional) pick your LLM — edit OLLAMA_MODEL in docker-compose.yml
#    Default is a cloud model; most users want a local one (see "Choosing an LLM").

# 3. Build and run
docker compose up --build
```

Then open **http://localhost:5173** (API docs at **http://localhost:8000/docs**).

> **Linux + local Ollama:** containers reach the host's Ollama via `host.docker.internal`,
> but Ollama listens on `127.0.0.1` by default. Make it reachable from containers:
> ```bash
> sudo mkdir -p /etc/systemd/system/ollama.service.d
> printf '[Service]\nEnvironment="OLLAMA_HOST=0.0.0.0"\n' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
> sudo systemctl daemon-reload && sudo systemctl restart ollama
> ```
> (macOS/Windows Docker Desktop resolve `host.docker.internal` automatically — no change needed.)

---

## 🛠️ Quick start — Native (no Docker)

**Backend:**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Required: strong secret. Generate one and create backend/.env:
cat > .env <<EOF
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest
EMBEDDING_MODEL=intfloat/multilingual-e5-base
DATABASE_URL=sqlite:///./docmind.db
UPLOAD_DIR=./uploads
CHROMA_DIR=./chroma_db
FRONTEND_URL=http://localhost:5173
EOF

uvicorn app.main:app --reload --port 8000
```
The first start downloads the embedding model (~1 GB) once.

**Frontend (new terminal):**
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:8000
npm run dev              # → http://localhost:5173
```

> **Python note:** `requirements.txt` uses unpinned/current versions because the original
> pinned versions don't build on the newest Python (3.13/3.14). For a byte-for-byte
> reproducible install on Python 3.11, use `backend/requirements.lock.txt`.

---

## ⚙️ Configuration

All backend settings come from environment variables (or `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | *(required)* | JWT signing key. **Must be ≥ 32 random chars** — the app refuses to start otherwise. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where Ollama is listening |
| `OLLAMA_MODEL` | `gemma4:31b-cloud` | The LLM to use — **see [Choosing an LLM](#-choosing-an-llm-important)** |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-base` | Local embedding model (auto-downloaded) |
| `DATABASE_URL` | `sqlite:///./docmind.db` | SQLite metadata DB |
| `UPLOAD_DIR` | `./uploads` | Where uploaded PDFs are stored |
| `CHROMA_DIR` | `./chroma_db` | ChromaDB persistence directory |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

---

## 🧠 Choosing an LLM (important!)

DocMind talks to **Ollama** for the answer-generation step, and the model you pick has a big
effect on speed and quality. The repo ships with `gemma4:31b-cloud` as the default, **but that
is a cloud-routed model that requires an Ollama account/subscription** — most people running
DocMind locally should switch to a **local** model.

👉 **Full guide with a hardware sizing table: [`docs/CHOOSING_A_MODEL.md`](docs/CHOOSING_A_MODEL.md)**

Quick recommendation:

| Your situation | Recommended model | Pull |
|---|---|---|
| Multilingual docs (incl. Chinese) — **best default** | `qwen2.5` (7B) | `ollama pull qwen2.5` |
| Low-RAM / want it fast, English docs | `llama3.2` (3B) | `ollama pull llama3.2` |
| Balanced general quality | `gemma3` | `ollama pull gemma3` |

**To change the model:** pull it with `ollama pull <model>`, then set `OLLAMA_MODEL` (in
`backend/.env` for native, or `docker-compose.yml` for Docker) and restart.

---

## 💡 Using the app

1. **Register** an account, then **log in**.
2. **Upload** a PDF (drag & drop). It processes in the background; the card shows
   `processing → ready`.
3. Click **Start Chat** and ask questions. Each answer shows expandable **sources** with page
   numbers and similarity scores.
4. Create multiple **chat sessions** per document; history is saved.

### 🎯 Tips for best results

- **Ask in the document's language.** The retriever is multilingual, but a query in the *same*
  language as the document matches more strongly. For a Chinese PDF, asking in Chinese gives
  noticeably better retrieval than asking in English.
- **Be specific.** "What accuracy did the BERT model reach on the test set?" retrieves better
  than "tell me about results."
- **Text-based PDFs only.** Scanned/image-only PDFs have no extractable text and will fail
  processing (DocMind tells you so).

---

## 📁 Project structure

```
docmind/
├── backend/          # FastAPI app, RAG services, auth
│   ├── app/
│   │   ├── routers/  # auth, documents, chat (the RAG /ask endpoint)
│   │   ├── services/ # pdf_parser, chunker, embedder, vector_store, llm
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── utils/    # auth (JWT/bcrypt), rate limiting, file handling
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # React + Vite + Tailwind SPA
│   ├── src/{pages,components,store,api}
│   └── Dockerfile + nginx.conf
├── docs/             # design specs + the model-picking guide
├── docker-compose.yml
└── README.md
```

---

## 🔒 Security notes

- Passwords are **bcrypt-hashed** (never stored in plaintext).
- **Per-account isolation** is enforced on every endpoint (you can only see your own
  documents/sessions).
- `SECRET_KEY` is **required and validated** — a weak/default value stops the app from
  starting. Keep it secret; never commit it (the `.env` files are gitignored).
- Login is **rate-limited** (per IP) to slow brute-force attempts.
- This is a local-first app and is **not end-to-end encrypted** (the server must read document
  content to answer questions). If you expose it beyond localhost, put it behind **HTTPS**.

---

## 📚 Docs

The full design specification lives in [`docs/`](docs/) (overview, backend, frontend, database,
RAG pipeline, deployment, and the build checklist), plus the
[model-picking guide](docs/CHOOSING_A_MODEL.md).

## 📄 License

MIT — see `LICENSE`. Replace the placeholder author with your name before publishing.
