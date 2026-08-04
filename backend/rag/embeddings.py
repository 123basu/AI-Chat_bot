import os

from memory_store import get_chunk_embedding, save_chunk_embedding

EMBED_MODEL = os.getenv("EMBED_MODEL", "openai/text-embedding-3-small")


def embed_texts(client, texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts via OpenRouter. Returns a list of vectors."""
    if not texts:
        return []
    response = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in response.data]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _ensure_embeddings(client, chunks: list[dict]) -> list[dict]:
    """Embed chunks that aren't cached yet, persist them, return enriched chunks."""
    missing = [
        c for c in chunks
        if get_chunk_embedding(c["source"], c["chunk_id"]) is None
    ]
    if missing:
        vectors = embed_texts(client, [c["text"] for c in missing])
        for chunk, vector in zip(missing, vectors):
            save_chunk_embedding(chunk["source"], chunk["chunk_id"], vector)

    enriched = []
    for c in chunks:
        vector = get_chunk_embedding(c["source"], c["chunk_id"])
        enriched.append({**c, "embedding": vector})
    return enriched


def search(client, chunks: list[dict], question: str, k: int = 3) -> list[dict]:
    """Rank chunks by cosine similarity between the question and each chunk."""
    query_vector = embed_texts(client, [question])[0]
    enriched = _ensure_embeddings(client, chunks)

    scored = []
    for c in enriched:
        score = cosine_similarity(query_vector, c["embedding"])
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "source": c["source"],
            "chunk_id": c["chunk_id"],
            "text": c["text"],
            "score": round(score, 4),
        }
        for score, c in scored[:k]
    ]
