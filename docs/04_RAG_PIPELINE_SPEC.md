# RAG Pipeline Spec — Deep Dive

RAG = Retrieval-Augmented Generation. This is the core intelligence of DocMind.

---

## 1. What is RAG?

Instead of sending an entire PDF to an LLM (which would exceed context limits), RAG:

1. **Indexes** the document by splitting it into chunks and embedding each one as a vector
2. **Retrieves** the most semantically relevant chunks for a given question
3. **Augments** the LLM prompt with those chunks as context
4. **Generates** an answer grounded in the actual document content

```
Question: "What is the main finding?"
     │
     ▼
[Embed question] → [384-dim query vector]
     │
     ▼
[ChromaDB cosine search] → top 4 chunks
     │
     ▼
[Build prompt: chunks + question]
     │
     ▼
[LLM generates answer]
     │
     ▼
Answer + source citations
```

---

## 2. Chunking Strategy

### Why Chunking?
- LLMs have context window limits (4k–128k tokens)
- Smaller chunks = more precise retrieval
- Overlap prevents losing information at chunk boundaries

### Parameters
```python
CHUNK_SIZE    = 512    # characters per chunk
CHUNK_OVERLAP = 64     # overlap between adjacent chunks
```

### Splitter Hierarchy
`RecursiveCharacterTextSplitter` tries these separators in order:
1. `\n\n` — paragraph breaks (preferred — preserves structure)
2. `\n` — line breaks
3. `. ` — sentence ends
4. ` ` — word boundaries (last resort)
5. `""` — character-level (absolute last resort)

### Example
```
Input (600 chars):
"Machine learning is a subset of AI...
[paragraph 1 — 250 chars]

Neural networks are inspired by...
[paragraph 2 — 300 chars]"

Output chunks:
Chunk 0 (250 chars): "Machine learning is a subset..."
Chunk 1 (300 chars): "Neural networks are inspired..."  ← no overlap needed here
```

### Metadata Per Chunk
```python
{
  "chunk_idx": 0,      # position in document
  "page": 3,           # source page number
  "text": "...",       # the actual content
}
```

---

## 3. Embedding Model

**Model:** `sentence-transformers/all-MiniLM-L6-v2`

| Property | Value |
|----------|-------|
| Output dimensions | 384 |
| Max input tokens | 256 |
| Model size | ~22MB |
| Speed | ~14k sentences/sec on CPU |
| Language | English (primarily) |
| License | Apache 2.0 |

This model is downloaded automatically on first use via `sentence-transformers`.

### Why this model?
- Fast enough to run on CPU (no GPU needed)
- Small enough to bundle in a Docker container
- Good semantic understanding for Q&A tasks
- Industry standard for RAG systems

### Embedding Process
```python
# On upload (batch):
texts = [chunk["text"] for chunk in chunks]
embeddings = model.encode(texts, batch_size=32, show_progress_bar=True)
# Result: numpy array of shape (N, 384)

# On question (single):
query_embedding = model.encode("What is the main finding?")
# Result: numpy array of shape (384,)
```

---

## 4. Vector Search (ChromaDB)

### Distance Metric
Uses **cosine distance** (configured via `hnsw:space: "cosine"`).

- Cosine distance = 0 → identical vectors
- Cosine distance = 1 → completely unrelated
- Similarity = 1 - distance

### Retrieval
```python
results = collection.query(
    query_embeddings=[query_embedding.tolist()],
    n_results=4,   # top 4 most relevant chunks
    include=["documents", "metadatas", "distances"]
)
```

### Score Thresholds (for UI color coding)
```
≥ 0.85 → 🟢 High relevance (green)
≥ 0.70 → 🟡 Medium relevance (yellow)
< 0.70 → 🔴 Low relevance (red) — may not be very related
```

---

## 5. Prompt Engineering

### System Prompt Design
The prompt is designed to:
- Ground the answer strictly in the document
- Return "not found" instead of hallucinating
- Include page citations naturally

### Prompt Template
```
You are a helpful assistant that answers questions based strictly on the provided document context.

CONTEXT FROM DOCUMENT:
[Page 3]: Machine learning is a subset of artificial intelligence that enables systems...

---

[Page 7]: The accuracy of the model was measured using a test set of 10,000 samples...

---

[Page 18]: In conclusion, our findings demonstrate that transformer-based architectures...

QUESTION: What accuracy did the model achieve?

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say "I couldn't find this in the document"
- Be concise and accurate
- Cite which part of the document your answer comes from

ANSWER:
```

### Why `temperature=0.2`?
Lower temperature = more deterministic, less creative = more factual answers. Good for Q&A tasks where accuracy > creativity.

---

## 6. Background Processing Task

The full pipeline runs as a FastAPI `BackgroundTask`:

```python
async def process_document(document_id: int, file_path: str, db: Session):
    try:
        # Step 1: Parse PDF
        parser = PDFParser()
        result = parser.extract_text(file_path)

        # Step 2: Chunk text
        chunker = TextChunker(chunk_size=512, chunk_overlap=64)
        chunks = chunker.chunk_pages(result["pages"])

        # Step 3: Embed chunks (batch for efficiency)
        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_texts(texts)

        # Step 4: Store in ChromaDB
        vector_store.add_chunks(document_id, chunks, embeddings)

        # Step 5: Update DB record
        doc = db.query(Document).filter(Document.id == document_id).first()
        doc.status = "ready"
        doc.page_count = result["page_count"]
        doc.chunk_count = len(chunks)
        doc.processed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        # Mark as failed
        doc = db.query(Document).filter(Document.id == document_id).first()
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        raise
```

---

## 7. Edge Cases to Handle

| Case | Handling |
|------|---------|
| PDF with only images (scanned) | Return error: "PDF contains no extractable text. Please use a text-based PDF." |
| PDF too large (>50MB) | Reject at upload, return 413 |
| Question with no relevant chunks | Return top chunks anyway, LLM will say "not found" |
| Very short document (<3 chunks) | Retrieve all available chunks |
| ChromaDB collection already exists | Use `get_or_create_collection` |
| LLM timeout | Catch timeout, return 504 with "LLM service unavailable" |
| Concurrent uploads | Background tasks handle this gracefully; each document has its own collection |

---

## 8. Performance Characteristics

| Operation | Time (approx) |
|-----------|--------------|
| PDF parsing (10-page doc) | < 1 second |
| Chunking | < 0.1 second |
| Embedding (50 chunks) | ~2-5 seconds on CPU |
| ChromaDB insert (50 chunks) | < 0.5 second |
| Query embedding (1 question) | < 0.5 second |
| ChromaDB cosine search | < 0.1 second |
| LLM generation (Ollama) | 5-30 seconds |
| LLM generation (OpenAI) | 2-8 seconds |

**Total for asking a question:** ~3-35 seconds depending on LLM.

---

## 9. Improvement Ideas (for extra credit / bonus)

1. **Hybrid search** — combine BM25 keyword search with vector similarity
2. **Reranking** — use a cross-encoder to rerank top-K results before sending to LLM
3. **Multi-document Q&A** — query across multiple documents at once
4. **Streaming responses** — stream LLM output token by token via SSE
5. **Chat history awareness** — include last 2 messages in prompt for follow-up questions
6. **Auto-session naming** — name sessions based on the first question asked
