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
        context = "\n\n---\n\n".join(
            f"[Page {c['page']}]: {c['text']}" for c in context_chunks
        )
        prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question)
        return self._call_ollama(prompt)

    def _call_ollama(self, prompt: str) -> str:
        """
        Calls local Ollama at port 11434 via the /api/chat endpoint.
        Model configured via OLLAMA_MODEL (default: qwen3.5:cloud).
        Cloud-backed models are routed through the local Ollama daemon.
        """
        try:
            response = httpx.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 1024,
                    },
                },
                timeout=120.0,  # Ollama can be slow on first run (model load)
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
        except httpx.TimeoutException as exc:
            raise RuntimeError("LLM service timed out") from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"LLM service error: {exc}") from exc


llm_service = LLMService()
