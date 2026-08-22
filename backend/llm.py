import os

import httpx
from dotenv import load_dotenv

load_dotenv()

LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama").strip().lower()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

DEFAULT_MAX_TOKENS = 1024


def chat_completion(messages: list[dict], max_tokens: int = DEFAULT_MAX_TOKENS) -> str:
    """Send a conversation to the configured LLM backend and return the reply text.

    Supported backends:
      - "ollama"    (default): local model via Ollama's native /api/chat endpoint.
                           ``think: false`` disables qwen3-style thinking so the
                           model answers directly instead of consuming all its
                           token budget on reasoning.
      - "openrouter": cloud API via the OpenAI SDK (requires OPENROUTER_API_KEY).
    """
    if LLM_BACKEND == "openrouter":
        return _openrouter_chat(messages, max_tokens)
    return _ollama_chat(messages, max_tokens)


def _ollama_chat(messages: list[dict], max_tokens: int) -> str:
    resp = httpx.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "think": False,
            "options": {"num_predict": max_tokens},
        },
        timeout=300,
    )
    resp.raise_for_status()
    data = resp.json()
    message = data.get("message", {})
    content = (message.get("content") or "").strip()
    if not content:
        content = (message.get("reasoning") or "").strip()
    return content


def _openrouter_chat(messages: list[dict], max_tokens: int) -> str:
    from openai import OpenAI

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
    completion = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=messages,
        max_tokens=max_tokens,
    )
    return (completion.choices[0].message.content or "").strip()