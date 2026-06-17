import chromadb

from app.config import settings


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DIR)

    def get_or_create_collection(self, collection_name: str):
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, document_id: int, chunks: list[dict], embeddings: list):
        collection = self.get_or_create_collection(f"doc_{document_id}")
        collection.add(
            ids=[f"doc_{document_id}_chunk_{c['chunk_idx']}" for c in chunks],
            embeddings=embeddings,
            documents=[c["text"] for c in chunks],
            metadatas=[
                {
                    "page": c["page"],
                    "chunk_idx": c["chunk_idx"],
                    "document_id": document_id,
                }
                for c in chunks
            ],
        )

    def query(self, document_id: int, query_embedding: list, n_results: int = 4):
        collection = self.get_or_create_collection(f"doc_{document_id}")
        # Don't ask for more results than exist in the collection
        available = collection.count()
        n_results = max(1, min(n_results, available)) if available else n_results
        return collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

    def delete_collection(self, document_id: int):
        try:
            self.client.delete_collection(f"doc_{document_id}")
        except Exception:
            pass


vector_store = VectorStore()
