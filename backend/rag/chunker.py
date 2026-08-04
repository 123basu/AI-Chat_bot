import re

HEADING_RE = re.compile(r"^#{1,3}\s+.+$", re.MULTILINE)


def chunk_document(doc: dict) -> list[dict]:
    """Split a single document into smaller, searchable chunks.

    Each markdown heading (#, ##, ###) starts a new chunk, so a section like
    "## Industrial Cement" plus its following lines becomes one paragraph of
    context instead of many meaningless fragments.

    Falls back to blank-line paragraph splitting when a file has no headings.
    """
    source = doc["source"]
    text = doc["text"].strip()
    headings = list(HEADING_RE.finditer(text))

    chunks = []

    if not headings:
        for i, para in enumerate(text.split("\n\n")):
            para = para.strip()
            if para:
                chunks.append(
                    {"source": source, "chunk_id": i, "text": para}
                )
        return chunks

    for i, match in enumerate(headings):
        start = match.start()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        section = text[start:end].strip()
        if section:
            chunks.append(
                {"source": source, "chunk_id": i, "text": section}
            )

    return chunks