from sentence_transformers import SentenceTransformer

from app.config import settings


class Embedder:
    def __init__(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        # e5 models require "query:" / "passage:" prefixes and normalized vectors.
        self._is_e5 = "e5" in settings.EMBEDDING_MODEL.lower()

    def _as_passages(self, texts: list[str]) -> list[str]:
        return [f"passage: {t}" for t in texts] if self._is_e5 else texts

    def _as_query(self, query: str) -> str:
        return f"query: {query}" if self._is_e5 else query

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(
            self._as_passages(texts),
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

    def embed_query(self, query: str) -> list[float]:
        return self.model.encode(
            self._as_query(query),
            normalize_embeddings=True,
        ).tolist()


# Singleton instance (loads the model once)
embedder = Embedder()
