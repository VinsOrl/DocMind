# Choosing an LLM for DocMind

DocMind uses **two** models. Only one of them is something you pick:

1. **The embedding model** (`intfloat/multilingual-e5-base`) — runs locally via
   `sentence-transformers`, downloads automatically, and turns text into vectors for
   retrieval. **You don't need to choose or pull this** — it just works, and it's multilingual.
2. **The LLM** (served by **Ollama**) — reads the retrieved chunks and writes the answer.
   **This is the one you choose**, via the `OLLAMA_MODEL` setting.

This guide is about picking that LLM.

---

## How the choice affects DocMind

The LLM only ever sees the handful of chunks the retriever found, plus your question. So its
job is **reading comprehension + writing**, not "knowing facts." That means:

- You **don't** need a huge model. A small/medium local model is usually plenty, because the
  facts come from your document, not the model's memory.
- What matters most is: **(a)** can it read your document's *language* well, and **(b)** does it
  fit in your RAM/VRAM and run at an acceptable speed.

---

## Quick recommendations

| Your situation | Model | Size (approx) | Pull |
|---|---|---|---|
| **Multilingual docs (Chinese/Japanese/etc.) — best default** | `qwen2.5` (7B) | ~4.7 GB | `ollama pull qwen2.5` |
| Multilingual but limited RAM | `qwen2.5:3b` | ~2 GB | `ollama pull qwen2.5:3b` |
| English docs, fast & light | `llama3.2` (3B) | ~2 GB | `ollama pull llama3.2` |
| English docs, more capable | `llama3.1:8b` | ~4.7 GB | `ollama pull llama3.1` |
| Balanced general quality | `gemma3` | ~3.3 GB | `ollama pull gemma3` |
| Tiny machine / quick demo | `gemma3:1b` or `qwen2.5:1.5b` | ~0.8–1 GB | `ollama pull gemma3:1b` |
| Best quality, strong hardware | `qwen2.5:14b` / `qwen2.5:32b` | ~9 / ~20 GB | `ollama pull qwen2.5:14b` |

**If you're not sure, use `qwen2.5`.** It's strong in English *and* many other languages
(including Chinese), which pairs well with DocMind's multilingual retrieval.

---

## Sizing to your hardware

Models run best in GPU VRAM but also run on CPU + system RAM (slower). Pick a model that fits;
if it doesn't fit in VRAM, Ollama spills to CPU/RAM automatically.

| You have | Comfortable model size | Examples |
|---|---|---|
| ≤ 8 GB RAM, no/weak GPU | 1–3B | `llama3.2`, `qwen2.5:3b`, `gemma3:1b` |
| 16 GB RAM or ~6–8 GB VRAM | 7–8B | `qwen2.5`, `llama3.1:8b`, `gemma3` |
| 32 GB RAM or 12–16 GB VRAM | 14B | `qwen2.5:14b` |
| 24 GB+ VRAM | 32B+ | `qwen2.5:32b` |

Rule of thumb: a 4-bit-quantized model needs roughly **(billions of params) GB** of memory
(e.g. a 7B model ≈ 5 GB). Leave headroom for the OS and DocMind itself.

### CPU-only?
It works — just slower (answers may take 10–40s). Prefer a **1–3B** model, and expect the
first answer to be slowest (the model loads into memory on first use).

---

## Language matters

Because DocMind grounds answers in your document, the LLM must be able to **read your
document's language**:

- **English only:** `llama3.2`, `llama3.1`, `gemma3`, `mistral` all work well.
- **Chinese / multilingual:** prefer `qwen2.5` (excellent CJK) or `gemma3`. Avoid English-centric
  small models like `llama3.2` for heavy Chinese content.

> Reminder: DocMind's *retrieval* is already multilingual, and you'll get the best results by
> **asking questions in the same language as the document** (see the README "Tips" section).

---

## Quantization tags (optional)

Ollama tags let you trade quality for size. The default tag is a sensible 4-bit quant. You can
request others, e.g. `qwen2.5:7b-instruct-q4_K_M` (smaller) or `...-q8_0` (larger, higher
fidelity). For most users the plain tag (`qwen2.5`) is the right call — only tune this if you're
squeezing into tight memory.

---

## Local vs cloud models

Ollama can also route to **cloud** models (tags ending in `-cloud`, e.g. `gemma4:31b-cloud`).
These run on Ollama's servers, so:

- ✅ No local GPU/RAM needed, very capable.
- ❌ Require an **Ollama account**, and large ones need a **paid subscription**.
- ❌ Your document chunks are sent to Ollama's cloud (not fully private).

> The repo's default `OLLAMA_MODEL` is `gemma4:31b-cloud`. For a private, free, fully-local
> setup, **switch to a local model** (e.g. `qwen2.5`).

---

## How to change the model

1. **Pull it:**
   ```bash
   ollama pull qwen2.5
   ```
2. **Set `OLLAMA_MODEL`:**
   - **Native:** edit `backend/.env` → `OLLAMA_MODEL=qwen2.5:latest`
   - **Docker:** edit `docker-compose.yml` → `OLLAMA_MODEL=qwen2.5:latest`
3. **Restart:**
   - Native: restart `uvicorn`
   - Docker: `docker compose up -d backend`
4. Ask a question — that's it. (No re-uploading needed; only the *embedding* model change would
   require re-processing documents, and you're not changing that.)

---

## Verifying your model works

```bash
# Is the model pulled and does Ollama answer?
ollama run qwen2.5 "Say hello in one word."

# Is DocMind's backend using it?
curl -s http://localhost:8000/health     # backend up
# then ask a question in the app and check the answer + sources
```

If you get `connection refused`, Ollama isn't reachable (start it, or for Docker on Linux set
`OLLAMA_HOST=0.0.0.0` — see the README). If you get `requires a subscription`, you're pointed at
a cloud model — switch to a local one.
