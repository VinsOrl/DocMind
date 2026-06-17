# Frontend Spec — React + Vite + Tailwind

---

## 1. Setup & Dependencies

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install

# Core deps
npm install axios zustand react-router-dom react-dropzone react-markdown

# UI
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Icons
npm install lucide-react

# Extras
npm install react-hot-toast date-fns
```

`tailwind.config.js`:
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",   // indigo-500
        surface: "#1e1e2e",   // dark card bg
        base: "#13131f",      // page bg
      }
    }
  },
  plugins: [],
}
```

---

## 2. Route Structure

```jsx
// App.jsx
<Router>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Protected routes */}
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/chat/:documentId" element={<ChatPage />} />
      <Route path="/chat/:documentId/session/:sessionId" element={<ChatPage />} />
    </Route>
  </Routes>
</Router>
```

`ProtectedLayout.jsx` — redirects to `/login` if no token in Zustand store.

---

## 3. Pages

### `LoginPage.jsx`
- Email + password form
- "Login" button → calls `POST /auth/login` → saves token to store
- Link to Register
- Dark themed card, centered layout
- Error toast on failed login

### `RegisterPage.jsx`
- Username + email + password + confirm password
- Validation: passwords must match, email format
- On success → redirect to login with success toast

### `DashboardPage.jsx`
- Heading: "My Documents"
- Grid of `DocumentCard` components
- "+ Upload New" button (top right) → goes to `/upload`
- Empty state: illustration + "Upload your first PDF"
- Shows: doc name, page count, chunk count, status badge, date, "Chat" button

**Status badges:**
- `processing` → yellow spinner badge
- `ready` → green badge
- `failed` → red badge

### `UploadPage.jsx`
- Full-page drag & drop zone (use `react-dropzone`)
- Accepts `.pdf` only, max 50MB
- Shows file preview: name, size, page estimate
- Upload progress bar (fake progress + real upload)
- On success → auto-redirect to `/chat/:documentId`
- Error handling: file too large, wrong format, server error

### `ChatPage.jsx` — Main Interface
- Split layout:
  - **Left sidebar (280px):** session history list for this document
  - **Main area:** chat window + input
- Top bar: document name, page count, "Back to Documents" link
- Create new session button in sidebar
- Load session → load messages from `/chat/sessions/:id`

---

## 4. Components

### `UploadDropzone.jsx`
```jsx
// Props: onFileAccepted(file), uploading, progress
// - Dashed border drop zone
// - Shows file icon + name once selected
// - Progress bar during upload
// - Accepts only PDF
```

### `DocumentCard.jsx`
```jsx
// Props: document { id, original_name, page_count, chunk_count, status, created_at }
// - Card with hover shadow
// - File icon (lucide FileText)
// - Status badge (color coded)
// - "Start Chat" button → navigate to /chat/:id
// - "Delete" icon button (with confirm dialog)
```

### `ChatWindow.jsx`
```jsx
// Props: messages[], isLoading
// - Scrollable message list
// - Auto-scrolls to bottom on new message
// - Loading: animated "thinking" bubble
// - Empty state: "Ask your first question about this document"
```

### `MessageBubble.jsx`
```jsx
// Props: message { question, answer, sources, created_at }
// Renders:
//   [User bubble] — right-aligned, indigo bg
//   [AI bubble]   — left-aligned, dark card bg
//     - Answer text (rendered as Markdown via react-markdown)
//     - Collapsible "Sources" section below answer
//     - Source count badge: "📄 3 sources"
```

### `SourceCard.jsx`
```jsx
// Props: source { chunk_id, text, page, similarity_score }
// Small card showing:
//   - Page number badge
//   - Similarity score (shown as %)
//   - Truncated text excerpt (max 3 lines, expand on click)
//   - Score bar (colored: green > 0.85, yellow > 0.7, red < 0.7)
```

### `ChatInput.jsx`
```jsx
// Props: onSubmit(question), disabled
// - Textarea that expands up to 4 rows
// - Send button (arrow icon)
// - Enter to send, Shift+Enter for newline
// - Disabled during loading
// - Character counter (max 500)
```

---

## 5. State Management (Zustand)

### `store/authStore.js`
```js
const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user") || "null"),

  login: (token, user) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    set({ token: null, user: null })
  }
}))
```

### `store/documentStore.js`
```js
const useDocumentStore = create((set) => ({
  documents: [],
  currentDocument: null,
  sessions: [],
  currentSession: null,
  messages: [],

  setDocuments: (docs) => set({ documents: docs }),
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  clearChat: () => set({ messages: [], currentSession: null })
}))
```

---

## 6. API Client

### `api/client.js`
```js
import axios from "axios"
import useAuthStore from "../store/authStore"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000  // 60s for LLM calls
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api
```

---

## 7. Environment Variables

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

For production (`frontend/.env.production`):
```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## 8. UI Design Guidelines

### Design Philosophy — Grain/Filmic Texture
> _"Warm, filmic, and readable — texture softens the scene without clouding content."_

This UI uses a **grain/noise overlay system** inspired by analog film photography.
Low-opacity noise (8–18%) is applied to backgrounds and large fills to add warmth
and prevent banding on gradients. Text areas stay clean and high-contrast.
Interactions use stroke/shadow brightness changes (never noise density) to avoid flicker.

---

### Color Palette — Warm Dark Theme
Mid/low saturation palette so the grain texture reads naturally over colors.

```
Page background:   #141210  (warm near-black, slight brown undertone)
Surface/Cards:     #1e1b18  (warm dark, like aged paper in dim light)
Surface raised:    #262118  (slightly lighter card variant)
Border:            #3a3228  (warm brown-gray)
Border subtle:     #2a2420  (very subtle divider)

Primary:           #c9a96e  (warm amber/gold — filmic highlight color)
Primary hover:     #d4b87a
Primary muted:     #8a6f3e  (dimmed amber for secondary actions)

Text main:         #e8e0d5  (warm off-white, not pure white)
Text muted:        #9a8f82  (warm gray)
Text faint:        #5a5248  (very dim, for timestamps/metadata)

Success:           #7ab87a  (desaturated green)
Warning:           #c9a040  (amber-toned warning)
Error:             #c97070  (desaturated red)

Grain overlay:     rgba(255,255,255,0.09)  — white noise at 9% on dark surfaces
                   rgba(0,0,0,0.06)        — dark noise on light elements
```

---

### Tailwind Config — Warm Grain Theme
```js
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base:      "#141210",
        surface:   "#1e1b18",
        raised:    "#262118",
        border:    "#3a3228",
        primary:   "#c9a96e",
        "primary-hover": "#d4b87a",
        "primary-muted": "#8a6f3e",
        "text-main":  "#e8e0d5",
        "text-muted": "#9a8f82",
        "text-faint": "#5a5248",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        // SVG noise grain — inlined as data URI, applied as overlay
        "grain": "url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")",
      }
    }
  },
  plugins: [],
}
```

---

### Global CSS — `src/index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Grain texture system ─────────────────────────────── */
/* Applied as a pseudo-element on large surfaces.
   Keep noise at 8–18% opacity. Text containers must NOT have this. */
.grain-layer {
  position: relative;
}
.grain-layer::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.09;          /* 9% — tweak between 8–18% per surface */
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
}
/* Strong grain for hero/large gradient backgrounds */
.grain-heavy::before { opacity: 0.14; }
/* Subtle grain for cards */
.grain-light::before  { opacity: 0.07; }

/* ── Base styles ──────────────────────────────────────── */
body {
  background-color: #141210;
  color: #e8e0d5;
  font-family: 'IBM Plex Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Card / surface ───────────────────────────────────── */
.card {
  background: #1e1b18;
  border: 1px solid #3a3228;
  border-radius: 12px;
  /* Soft warm shadow, not harsh drop shadow */
  box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(201,169,110,0.06);
}
/* Hover: brighten border + shadow, NOT the grain */
.card:hover {
  border-color: #c9a96e44;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.12);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* ── Buttons ──────────────────────────────────────────── */
.btn-primary {
  background: #c9a96e;
  color: #141210;
  font-weight: 500;
  border-radius: 8px;
  padding: 8px 16px;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary:hover {
  background: #d4b87a;
  box-shadow: 0 0 12px rgba(201,169,110,0.3);
}

/* ── Input fields — clean, no grain ──────────────────── */
.input-field {
  background: #262118;
  border: 1px solid #3a3228;
  color: #e8e0d5;
  border-radius: 8px;
  padding: 10px 14px;
  transition: border-color 0.15s ease;
}
.input-field:focus {
  outline: none;
  border-color: #c9a96e88;
  box-shadow: 0 0 0 3px rgba(201,169,110,0.1);
}

/* ── Chat bubbles ─────────────────────────────────────── */
.bubble-user {
  background: #c9a96e22;
  border: 1px solid #c9a96e33;
  border-radius: 16px 16px 4px 16px;
}
.bubble-ai {
  background: #1e1b18;
  border: 1px solid #3a3228;
  border-radius: 16px 16px 16px 4px;
}
```

---

### Typography
- **Font:** `IBM Plex Sans` (import from Google Fonts) — has a warm, editorial feel vs. cold Inter
- **Mono:** `IBM Plex Mono` — for source chunk text excerpts
- Headings: `font-weight: 500–600`, `letter-spacing: -0.02em`
- Body: 14–15px, `line-height: 1.65`
- Timestamps/meta: `text-faint` color, `font-size: 12px`

---

### Spacing & Shape
- Cards: `rounded-xl` (12px), `p-5`, use `.card` class
- Buttons: `rounded-lg` (8px), use `.btn-primary` or outline variant
- Inputs: `rounded-lg`, use `.input-field` class
- Sidebar: `rounded-none` or very subtle rounded on inner items

---

### Loading States
- Skeleton loaders: warm gray `#262118` → `#2e2920` shimmer animation
- Upload progress bar: amber `#c9a96e` fill on dark track
- AI thinking: three dots `● ● ●` pulsing in amber, not white

---

### Where to Apply Grain (and where NOT to)

| Element | Grain? | Opacity |
|---------|--------|---------|
| Page background (`<body>`) | ✅ Yes | 9% via `grain-layer` |
| Hero/banner sections | ✅ Yes heavy | 14% via `grain-heavy` |
| Card backgrounds | ✅ Yes light | 7% via `grain-light` |
| Sidebar background | ✅ Yes | 9% |
| Upload dropzone | ✅ Yes | 9% |
| **Text content areas** | ❌ No | — keep clean |
| **Input fields** | ❌ No | — keep clean |
| **Chat message text** | ❌ No | — keep readable |
| Buttons | ❌ No | — keep crisp |

---

## 9. Key UX Details

1. **Upload → Chat redirect** — after upload succeeds, auto-navigate to the new document's chat page
2. **Session auto-create** — if user lands on `/chat/:docId` with no session, auto-create one
3. **Optimistic UI** — show user's question immediately, then stream in the answer
4. **Error boundaries** — catch API failures, show toast + retry option
5. **Source accordion** — sources are collapsed by default, expand on click
6. **Similarity color coding** — high score = desaturated green, medium = amber, low = muted red (match warm palette)
7. **Document status polling** — poll `/documents/:id/status` every 2s until `status === "ready"`

---

## 10. Grain Texture — Implementation Guide for Claude Code

> This section tells Claude Code exactly HOW to implement the filmic grain design system.

### Core Principle
Grain is applied via **SVG `<feTurbulence>` filter as a CSS pseudo-element** (`::before`).
It never sits on top of text. It sits behind content inside a `position: relative` container.

### Step-by-step Implementation

**Step 1 — Add grain utility to `index.css`** (the `.grain-layer`, `.grain-heavy`, `.grain-light` classes from Section 8).

**Step 2 — Wrap page-level backgrounds:**
```jsx
// layouts/ProtectedLayout.jsx
<div className="grain-layer min-h-screen bg-base">
  <Navbar />
  <Outlet />
</div>
```

**Step 3 — Apply to cards (grain-light, not full):**
```jsx
// components/document/DocumentCard.jsx
<div className="card grain-light relative p-5">
  {/* content is above grain via z-index: 1 */}
  <div className="relative z-10">
    <h3 className="text-text-main font-medium">{doc.original_name}</h3>
    ...
  </div>
</div>
```

**Step 4 — Chat window background gets grain, message bubbles do NOT:**
```jsx
// components/chat/ChatWindow.jsx
<div className="grain-layer flex-1 overflow-y-auto p-4 bg-base">
  {messages.map(msg => (
    // bubbles: no grain class here
    <MessageBubble key={msg.id} message={msg} />
  ))}
</div>
```

**Step 5 — Upload dropzone — heavy grain for large empty area:**
```jsx
// components/document/UploadDropzone.jsx
<div className="grain-heavy card flex flex-col items-center justify-center
                min-h-64 border-2 border-dashed border-border cursor-pointer
                hover:border-primary transition-colors">
  <div className="relative z-10 text-center">
    <FileText className="mx-auto mb-3 text-primary" size={40} />
    <p className="text-text-main">Drop your PDF here</p>
    <p className="text-text-muted text-sm mt-1">or click to browse</p>
  </div>
</div>
```

**Step 6 — Interactions: change stroke/shadow, not grain:**
```jsx
// CORRECT: hover changes border color + shadow only
<div className="card grain-light hover:border-primary/30 hover:shadow-amber transition-all">

// WRONG: never toggle grain class on hover (causes flicker)
<div className={`card ${isHovered ? 'grain-heavy' : 'grain-light'}`}>  // ❌
```

**Step 7 — Sidebar:**
```jsx
// components/layout/Sidebar.jsx
<aside className="grain-layer w-70 h-screen bg-surface border-r border-border flex flex-col">
  <div className="relative z-10 flex-1 overflow-y-auto p-3">
    {sessions.map(s => <SessionItem key={s.id} session={s} />)}
  </div>
</aside>
```

### Animation Rules (filmic = calm)
```css
/* All transitions: slow and smooth, like film dissolve */
transition-duration: 200ms;        /* default */
transition-timing-function: ease;  /* no bouncy spring */

/* No: transform scale on hover (too digital) */
/* Yes: opacity + shadow shift on hover (filmic) */
.card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
```

### Loading Skeleton (warm shimmer)
```css
@keyframes shimmer-warm {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1e1b18 25%, #2e2920 50%, #1e1b18 75%);
  background-size: 800px 100%;
  animation: shimmer-warm 1.6s ease infinite;
}
```
