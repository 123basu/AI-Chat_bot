from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "company-data"


def load_documents() -> list[dict]:
    """Load every .md file in company-data/ into a list of dicts.

    Each dict has the shape:
        {"source": "product_catalog.md", "text": "<full file contents>"}
    """
    if not DATA_DIR.exists():
        return []

    documents = []
    for path in sorted(DATA_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        documents.append({"source": path.name, "text": text})

    return documents