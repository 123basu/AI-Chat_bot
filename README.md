# AI Chat Assistant

A chat application using React + Vite (frontend) and FastAPI (backend). It runs
on a **local LLM via Ollama** by default (OpenRouter is supported as an
alternative). Features user accounts, persistent memory (SQLite), long-term fact
extraction, company-document RAG (`@company`), and a basic tool-calling AI Agent
system.

---

## Architecture

### Tool-Agent Flow

```
User message
    │
    ▼
FastAPI /chat endpoint
    │
    ├── route_tool() ──► Tool matches? ──► Execute tool ──► Return result
    │                                     (calculator, weather, …)
    │
    └── No tool match ──► Normal LLM chat
                                  │
                                  ▼
                          LLM generates response
                                  │
                                  ▼
                          Reply sent to user
```

When a tool **is** invoked, the tool result is fed back to the LLM so it can
produce a natural-language answer using the computed data.

### Folder Structure

```
AI-Chat/
├── backend/
│   ├── main.py               FastAPI app, routes, tool integration
│   ├── memory_store.py       SQLite persistence layer
│   ├── tools/
│   │   ├── __init__.py       Tool registry + route_tool()
│   │   ├── calculator.py     Safe math expression evaluator
│   │   └── weather.py        Mock weather lookup
│   ├── .env                  OPENROUTER_API_KEY
│   ├── requirements.txt
│   └── chat_memory.db        (auto-created SQLite DB)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           Main UI component
│   │   ├── App.css           Styles
│   │   ├── main.jsx          React entry point
│   │   └── index.css         Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json
│
├── docs/
│   └── memory-implementation.md
│
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) running locally with a chat model
  (e.g. `qwen3:4b`)

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
# source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```
# Which LLM backend to use: "ollama" (local) or "openrouter" (cloud)
LLM_BACKEND=ollama

# Ollama settings (used when LLM_BACKEND=ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b

# OpenRouter settings (used when LLM_BACKEND=openrouter)
# OPENROUTER_API_KEY=your_key_here
# OPENROUTER_MODEL=openrouter/free

# Admin panel key (optional, required to use /admin)
# ADMIN_PASSWORD=change_me
```

Run the server:

```bash
uvicorn main:app --reload
```

On first startup the SQLite database (`backend/chat_memory.db`) is created
automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Local LLM with Ollama

All model calls go through `backend/llm.py`. It reads three env vars:

| Var | Default | Purpose |
|---|---|---|
| `LLM_BACKEND` | `ollama` | `ollama` (local) or `openrouter` (cloud) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama's local HTTP server |
| `OLLAMA_MODEL` | `qwen3:4b` | Which installed model to use |

### How Ollama + OpenRouter compare

Both expose the same idea — you send a list of `messages` with `role`/`content`
and get back the model's reply — but:

- **OpenRouter** is a *cloud* API. You POST JSON to
  `https://openrouter.ai/api/v1` and the model runs on their servers.
- **Ollama** is a *local* server. It runs the model on **your** machine at
  `http://localhost:11434`.

Under the hood `llm.py` calls Ollama's native endpoint `POST /api/chat` with:

```json
{
  "model": "qwen3:4b",
  "messages": [{"role": "user", "content": "hi"}],
  "stream": false,
  "think": false
}
```

### qwen3 "thinking mode"

`qwen3` models think before answering. When thinking is enabled they dump their
reasoning into a separate `reasoning` field and can spend the whole token budget
there, returning an empty `content`. That's why `llm.py` always sends
`"think": false` — the model answers directly. If you switch to a model without
thinking (e.g. `llama3.2`, `qwen2.5`), the flag is simply ignored.

### Switch the model

```bash
ollama pull llama3.2        # download a new model
ollama list                 # see installed models
```

Then set `OLLAMA_MODEL=llama3.2` in `backend/.env` and restart the backend.

### Switch back to OpenRouter

Set `LLM_BACKEND=openrouter` and add your `OPENROUTER_API_KEY` in
`backend/.env`. The `llm.py` helper lazily builds an OpenAI client pointing at
OpenRouter, so a missing key no longer prevents the server from starting.

---

## Tool System

### How It Works

1. User sends a message
2. `route_tool()` in `backend/tools/__init__.py` iterates through the tool
   registry and calls each tool's `match()` function
3. If a tool matches, its `execute()` is called and the result is injected
   into the LLM context
4. The LLM produces a natural-language answer using the tool result
5. If no tool matches, the message is handled by the LLM normally

### Adding a New Tool

Create a new file in `backend/tools/` (e.g. `time.py`):

```python
import re

NAME = "time"
DESCRIPTION = "Get the current time for a timezone"

def match(message: str) -> dict | None:
    m = re.search(r"(?:what|current)\s*(?:time|hour)", message, re.IGNORECASE)
    if m:
        return {"timezone": "local"}
    return None

def execute(timezone: str) -> dict:
    # Call a real API or return mock data
    return {"timezone": timezone, "time": "12:34 PM"}
```

Then register it in `backend/tools/__init__.py`:

```python
from . import time

REGISTRY = [
    calculator,
    weather,
    time,         # <-- add here
]
```

### Tool Contract

Every tool module must export:

| Export | Type | Description |
|---|---|---|
| `NAME` | `str` | Unique tool identifier |
| `DESCRIPTION` | `str` | Human-readable description |
| `match(message)` | `(str) -> dict \| None` | Returns params dict if message matches, else `None` |
| `execute(**params)` | `(...) -> dict` | Performs the action, returns result dict |

---

## Tools

### Calculator

- **Patterns**: "what is X?", "calculate X", "solve X", or a raw expression
- **Safe evaluation**: Uses Python's `ast` module — only mathematical operators,
  constants (`pi`, `e`), and numeric literals are allowed. No `eval()`.
- **Supported operations**: `+`, `-`, `*`, `/`, `%`, `**` (power), parentheses
- **Input**: `"What is 234 × 567?"`
- **Output**: `{"expression": "234 × 567", "result": 132678}`

### Weather (Mock)

- **Patterns**: "weather in CITY", "temperature of CITY", "how hot is CITY"
- **Supported cities**: Bangalore, Delhi, Mumbai, Hyderabad
- **Unknown city**: Returns `{"city": "...", "error": "City not found"}`
- **Swapping to a real API**: Replace the `MOCK_DATA` lookup in
  `backend/tools/weather.py` with an HTTP call (e.g. OpenWeatherMap) —
  the `match()` and `execute()` interface stays the same.

---

## Memory

- **Conversation persistence**: Stored in SQLite (`messages` table) — survives
  server restarts.
- **Long-term facts**: Every 3rd user message, the LLM extracts personal facts
  and stores them in the `facts` table. Facts are injected into the system
  prompt on subsequent messages.
- **Session management**: Sessions can be renamed, deleted, or selected from
  the sidebar.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Create an account, returns a bearer token |
| `POST` | `/auth/login` | Log in, returns a bearer token |
| `POST` | `/auth/logout` | Invalidate the bearer token |
| `GET` | `/auth/me` | Get the current user |
| `POST` | `/chat` | Send a message (auto-detects tool usage / `@company`) |
| `POST` | `/reset` | Clear conversation for a session |
| `GET` | `/chat/{session_id}/messages` | Load messages for a session |
| `GET` | `/sessions` | List all sessions for the current user |
| `DELETE` | `/chat/{session_id}` | Delete a session and its messages |
| `PATCH` | `/chat/{session_id}/rename` | Rename a session |
| `GET` | `/admin` | Admin panel (requires `ADMIN_PASSWORD`) |
| `GET` | `/admin/users` | List users (admin) |
| `POST` | `/admin/users/{user_id}/block` | Block/unblock a user (admin) |

### POST /chat

```json
{
  "message": "What is 234 × 567?",
  "session_id": "abc-123",
  "user_id": "xyz-789"
}
```

Response:

```json
{
  "reply": "234 × 567 = 132,678"
}
```

---

## Deployment

- **Frontend**: Deploy to Vercel — point to `frontend/` directory.
- **Backend**: Deploy to Render — use `backend/render.yaml` or point to
  `backend/` directory.

Update `frontend/vercel.json` with your actual Render backend URL before
deploying.
