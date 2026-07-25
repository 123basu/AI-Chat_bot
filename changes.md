# Changelog — AI Chat Assistant

All significant changes made during the development session.

---

## 1. Project Scaffolding

- Created directory structure: `frontend/` (React + Vite) and `backend/` (FastAPI)
- Initialized virtual environment in `backend/venv`
- Created `requirements.txt` with dependencies: `fastapi`, `uvicorn`, `openai`, `python-dotenv`

## 2. Backend — Initial Implementation (Gemini)

- **File:** `backend/main.py`
- Single `POST /chat` endpoint accepting `{"message": "..."}`
- Integrated Google Gemini via `google.generativeai` (`gemini-2.5-flash-lite`)
- CORS middleware configured
- Health check endpoints: `GET /` and `GET /health`

## 3. Frontend — Initial Implementation

- **File:** `frontend/src/App.jsx` — basic chat UI with input, send button, and reply display
- **File:** `frontend/src/App.css` — minimal styling
- **File:** `frontend/vite.config.js` — dev proxy `/api` → `http://localhost:8000`
- **File:** `frontend/vercel.json` — Vercel rewrites for production
- **File:** `frontend/index.html`, `main.jsx`, `index.css` — Vite scaffolding

## 4. Gemini Model Fix

- **Problem:** `gemini-2.5-flash-lite` returned `404` — model not available to new users
- **Fix:** Changed model to `gemini-1.5-flash` (most widely available)
- **File:** `backend/main.py` line 11

## 5. Frontend Error Handling Improvement

- **File:** `frontend/src/App.jsx`
- **Change:** `catch` block now shows backend error detail (`data.detail`) instead of generic "Could not reach the server" when backend responds with an HTTP error

## 6. Switch from Gemini to OpenRouter

- **Problem:** Google Gemini models restricted for free/new tiers
- **Fix:** Replaced `google-generativeai` with OpenAI-compatible OpenRouter client
- **File:** `backend/main.py` — uses `openai.OpenAI` with `base_url="https://openrouter.ai/api/v1"`
- **File:** `backend/requirements.txt` — `openai` replaces `google-generativeai`
- **File:** `backend/.env` — `OPENROUTER_API_KEY` replaces `GEMINI_API_KEY`
- **Model:** `openrouter/free` (free tier models via OpenRouter)

## 7. Environment Variable Configuration

- Moved API key from `.env` file to Windows System Environment Variables
- Variable name: `OPENROUTER_API_KEY`
- Removes risk of committing secrets to version control

## 8. UI Redesign (Chat Layout)

- **File:** `frontend/src/App.jsx`, `frontend/src/App.css`
- **Changes:**
  - Input clears after sending (`setInput("")`)
  - Messages displayed in chat-like format: user blue bubbles (right-aligned), AI white rectangular boxes (centered)
  - Auto-scroll to latest message on each new message
  - "Hello!" greeting shown only when no messages exist
  - Full-height chat container with scrollable message area

## 9. Conversation Memory (Per-User Sessions)

- **File:** `backend/main.py`
- **Changes:**
  - In-memory `dict` storing conversation history per `session_id`
  - Each session starts with a system prompt: "You are a helpful assistant."
  - Entire history sent to OpenRouter on each request for context awareness
  - History capped at `MAX_EXCHANGES = 20` (20 user-assistant pairs) to prevent unbounded memory growth
  - `ChatRequest` model extended with `session_id` field

## 10. Reset Endpoint

- **File:** `backend/main.py`
- **Endpoint:** `POST /reset` with `{"session_id": "..."}`
- Clears conversation history for the given session and reinitializes system prompt
- **File:** `frontend/src/App.jsx`
- Added "New Chat" button that calls `/reset` and clears local message state

## 11. Title Change

- **File:** `frontend/src/App.jsx`
- **Change:** Title changed from "AI Assistant" to "AI made by AI"

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app with `/chat` and `/reset` endpoints |
| `backend/requirements.txt` | Python dependencies |
| `backend/.env` | Environment variable template |
| `backend/render.yaml` | Render deployment blueprint |
| `frontend/package.json` | Node.js dependencies and scripts |
| `frontend/vite.config.js` | Vite config with dev proxy |
| `frontend/vercel.json` | Vercel rewrites for deployment |
| `frontend/index.html` | HTML entry point |
| `frontend/src/main.jsx` | React entry point |
| `frontend/src/App.jsx` | Main chat component |
| `frontend/src/App.css` | Styling |
| `frontend/src/index.css` | Global reset |
| `.gitignore` | Ignored files |
| `README.md` | Setup instructions |
| `changes.md` | This file |
| `DEPLOY.md` | Deployment guide |

---

## Files Modified

| File | Change |
|------|--------|
| `backend/main.py` | Model fix, OpenRouter migration, session memory, reset endpoint |
| `backend/requirements.txt` | Gemini → OpenRouter dependency |
| `backend/.env` | API key variable name |
| `frontend/src/App.jsx` | Error handling, UI redesign, session management, New Chat button, title |
| `frontend/src/App.css` | Chat bubble styling, layout, auto-scroll |
| `README.md` | Updated for OpenRouter setup |
