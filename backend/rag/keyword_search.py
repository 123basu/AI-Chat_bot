import re

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been",
    "in", "on", "at", "of", "and", "or", "to", "for", "with",
    "what", "whats", "which", "who", "whose", "whom", "how", "when",
    "where", "do", "does", "did", "you", "your", "yourself",
    "i", "me", "my", "we", "us", "our", "they", "them", "their",
    "please", "tell", "about", "give", "show", "can", "could", "would",
    "will", "is", "the", "this", "that",
}


def tokenize(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return set(t for t in tokens if t not in STOPWORDS)


def search(chunks: list[dict], question: str, k: int = 3) -> list[dict]:
    query_tokens = tokenize(question)
    if not query_tokens:
        return []

    scored = []
    for chunk in chunks:
        chunk_tokens = tokenize(chunk["text"])
        matched = chunk_tokens & query_tokens
        if not matched:
            continue
        score = len(matched) / len(query_tokens)
        scored.append(
            {**chunk, "matched": sorted(matched), "score": round(score, 3)}
        )

    scored.sort(key=lambda c: (c["score"], len(c["matched"])), reverse=True)
    return scored[:k]