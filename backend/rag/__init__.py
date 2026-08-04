from .loader import load_documents
from .chunker import chunk_document
from .keyword_search import search as keyword_search
from . import embeddings

_chunks = None


def _ensure_index() -> list[dict]:
    """Build the chunk index once and cache it in memory."""
    global _chunks
    if _chunks is None:
        chunks = []
        for doc in load_documents():
            chunks.extend(chunk_document(doc))
        _chunks = chunks
    return _chunks


def retrieve(question: str, k: int = 3, client=None) -> list[dict]:
    """Return the top-k chunks relevant to the question.

    When a client is provided, retrieval uses semantic embeddings
    (cosine similarity). If embedding fails for any reason, it silently
    falls back to keyword search.

    Each result has: {"source", "chunk_id", "text", "score"}.
    """
    chunks = _ensure_index()
    if client is not None:
        try:
            return embeddings.search(client, chunks, question, k)
        except Exception:
            pass
    return keyword_search(chunks, question, k)