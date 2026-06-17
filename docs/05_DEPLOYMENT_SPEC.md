# Deployment Spec — Docker + Render.com

---

## 1. Docker Setup (Local Dev)

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download embedding model so container doesn't download on first request
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

# Create dirs
RUN mkdir -p uploads chroma_db

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

# Production stage (serve with Nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `frontend/nginx.conf`
```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;   # SPA routing
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### `docker-compose.yml` (Development)
```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app          # hot reload
      - uploads_data:/app/uploads
      - chroma_data:/app/chroma_db
    environment:
      # Ollama runs on HOST machine at 11434 — Docker accesses via host.docker.internal
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - OLLAMA_MODEL=gemma3:latest    # or qwen2.5:latest
      - SECRET_KEY=dev-secret-key
      - FRONTEND_URL=http://localhost:5173
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  uploads_data:
  chroma_data:
```

---

## 2. Cloud Deployment — Render.com

Render.com has a **free tier** that is sufficient for this project.

### Step 1: Prepare Repository

Push everything to GitHub:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/yourusername/docmind.git
git push -u origin main
```

### Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name:** `docmind-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. Environment Variables (add these in Render dashboard):
```
# LLM — Ollama via a public cloud Ollama proxy, or use OpenRouter (free tier)
# Option A: Run Ollama on your Ubuntu server + expose via Cloudflare Tunnel
OLLAMA_BASE_URL=https://your-ollama-tunnel.trycloudflare.com
OLLAMA_MODEL=gemma3:latest

# Option B: Use OpenRouter (free, supports gemma & qwen via OpenAI-compatible API)
# → sign up at openrouter.ai, get a free API key, then set:
# OLLAMA_BASE_URL=https://openrouter.ai/api/v1
# OLLAMA_MODEL=google/gemma-3-27b-it:free
# (update llm.py to use /api/chat endpoint for OpenRouter)

SECRET_KEY=<generate a random 32-char string>
DATABASE_URL=sqlite:///./docmind.db
UPLOAD_DIR=./uploads
CHROMA_DIR=./chroma_db
FRONTEND_URL=https://docmind-frontend.onrender.com
```

> ⚠️ **Note:** Render free tier has ephemeral storage — files are deleted on redeploy.
> For a demo/final project this is fine. Note it in your README.
> 
> **Recommended for deployment LLM:** expose your local Ubuntu server's Ollama via
> Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:11434`) and paste
> the tunnel URL as `OLLAMA_BASE_URL`. This way Render calls YOUR machine's Ollama.

5. Click **Deploy** → wait ~3 minutes
6. Copy your backend URL: `https://docmind-backend.onrender.com`

### Step 3: Deploy Frontend on Render

1. New → **Static Site**
2. Settings:
   - **Name:** `docmind-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Environment Variables:
```
VITE_API_URL=https://docmind-backend.onrender.com
```
4. Click **Deploy**
5. Your live URL: `https://docmind-frontend.onrender.com`

### Step 4: Update Backend CORS

After both are deployed, update the backend env var:
```
FRONTEND_URL=https://docmind-frontend.onrender.com
```
Then redeploy backend.

---

## 3. Alternative: Railway.app

If Render doesn't work, Railway is another free option:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Railway auto-detects Dockerfile and deploys.

---

## 4. Production `docker-compose.prod.yml`

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    restart: always
    volumes:
      - uploads_data:/app/uploads
      - chroma_data:/app/chroma_db
    environment:
      # Point to Ollama on host machine (or Cloudflare Tunnel URL for cloud deploy)
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL}
      - OLLAMA_MODEL=${OLLAMA_MODEL}   # gemma3:latest or qwen2.5:latest
      - SECRET_KEY=${SECRET_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
    expose:
      - "8000"

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${BACKEND_URL}
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  uploads_data:
  chroma_data:
```

---

## 5. README.md Template (for submission)

```markdown
# DocMind — Document Q&A System

A full-stack RAG (Retrieval-Augmented Generation) application that lets you
upload PDF documents and ask natural language questions about them.

## 🌐 Live Demo
**Frontend:** https://docmind-frontend.onrender.com  
**API Docs:** https://docmind-backend.onrender.com/docs

## 🛠️ Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand
- **Backend:** FastAPI, Python 3.11
- **AI/ML:** sentence-transformers, ChromaDB, OpenAI GPT-3.5
- **Database:** SQLite (metadata), ChromaDB (vectors)
- **Deployment:** Render.com

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- (Optional) Ollama for local LLM

### Steps
\`\`\`bash
# Clone
git clone https://github.com/yourusername/docmind.git
cd docmind

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in your values
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
\`\`\`

## 📐 Architecture
See `00_PROJECT_OVERVIEW.md` for full system diagram.

## 👤 Author
[Your Name] — [Your Student ID]  
National Quemoy University, CSIE Department
```

---

## 6. Submission Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Can register a new account
- [ ] Can upload a PDF
- [ ] Can ask questions and receive answers with source citations
- [ ] Chat history is saved and viewable
- [ ] Live URL pasted into the class submission form
- [ ] README.md includes team members and live URL
