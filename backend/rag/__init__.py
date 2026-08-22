from .loader import load_documents
from .chunker import chunk_document
from .keyword_search import search as keyword_search

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


def retrieve(question: str, k: int = 3) -> list[dict]:
    """Return the top-k chunks relevant to the question.

    Uses lightweight keyword search (token overlap) so it needs no
    embedding model. Each result has: {"source", "chunk_id", "text", "score"}.
    """
    chunks = _ensure_index()
    return keyword_search(chunks, question, k)