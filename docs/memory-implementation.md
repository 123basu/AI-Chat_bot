# Memory Implementation — AI Chat

This document explains the persistent memory system added to the AI Chat
project, including database schema, data flow, code changes, and UI redesign.

---

## 1. Architecture Overview

```
Frontend (React + Vite)                    Backend (FastAPI)
┌──────────────────────┐                  ┌───────────────────────┐
│  App.jsx             │  POST /chat      │  main.py              │
│  ┌──────────────┐    │ ──────────────>  │  ┌─────────────────┐  │
│  │ localStorage │    │  {message,       │  │  memory_store   │  │
│  │  ai-chat-    │    │   session_id,    │  │  .py            │  │
│  │  user-id     │    │   user_id}       │  │  ┌───────────┐  │  │
│  └──────────────┘    │                  │  │  │ SQLite    │  │  │
│                      │ <──────────────  │  │  │ chat_     │  │  │
│                      │  {reply}         │  │  │ memory.db │  │  │
│                      │                  │  │  └───────────┘  │  │
│                      │                  │  └─────────────────┘  │
│                      │                  └───────────────────────┘
```

### Data Flow — Sending a Message

```
1. User types message → handleSend() in App.jsx
2. Frontend sends POST /api/chat with:
   - message: "Hello"
   - session_id: "abc-123" (generated per chat session)
   - user_id: "xyz-789" (from localStorage, persists across browser sessions)
3. Backend main.py receives request
4. build_system_prompt(user_id) → reads facts from SQLite facts table
5. get_conversation(session_id) → reads message history from SQLite
6. System prompt + history + new user message → LLM (OpenRouter)
7. LLM reply → saved to SQLite messages table
8. extract_facts_from_messages() → periodically asks LLM to extract
   facts, stores them in SQLite facts table
9. Reply sent back to frontend
```

### Data Flow — Loading Conversation History

```
1. User clicks a past session in the sidebar
2. Frontend sends GET /api/chat/{session_id}/messages
3. Backend queries messages table WHERE session_id = ?
4. Returns all messages (ordered by id)
5. Frontend renders them as chat bubbles
```

---

## 2. Database Schema (SQLite)

File: `backend/chat_memory.db` (auto-created on server start)

### Table: `messages`

| Column       | Type     | Description                         |
|-------------|----------|-------------------------------------|
| id          | INTEGER  | Primary key (auto-increment)        |
| session_id  | TEXT     | Identifies a single chat session    |
| user_id     | TEXT     | Identifies a user across sessions   |
| role        | TEXT     | "user" or "assistant"               |
| content     | TEXT     | The actual message text             |
| created_at  | TIMESTAMP| Auto-set on insert                  |

Indexes: `idx_messages_session(session_id)`, `idx_messages_user(user_id)`

### Table: `facts`

| Column       | Type     | Description                         |
|-------------|----------|-------------------------------------|
| id          | INTEGER  | Primary key (auto-increment)        |
| user_id     | TEXT     | Identifies the user                 |
| fact_key    | TEXT     | Fact name (e.g., "user_name")       |
| fact_value  | TEXT     | Fact value (e.g., "Alice")          |
| created_at  | TIMESTAMP| When first learned                  |
| updated_at  | TIMESTAMP| When last updated                   |

Unique constraint: `(user_id, fact_key)` — one fact key per user.
Index: `idx_facts_user(user_id)`

---

## 3. Code Changes

### 3.1 New File: `backend/memory_store.py`

Replaces the in-memory `conversations` dict with SQLite persistence.

Key functions:

| Function | Purpose |
|---|---|
| `init_db()` | Creates tables and indexes on server startup |
| `save_message(session_id, user_id, role, content)` | Inserts a message into DB |
| `get_conversation(session_id)` | Returns all messages for a session ordered by time |
| `get_user_sessions(user_id)` | Returns all sessions for a user (with first message as title) |
| `reset_conversation(session_id)` | Deletes all messages for a session |
| `upsert_fact(user_id, key, value)` | Inserts or updates a fact |
| `get_all_facts(user_id)` | Returns all facts for a user as a dict |

### 3.2 Modified: `backend/main.py`

**Removed:**
- `conversations: dict[str, list[dict]] = {}` (in-memory storage)
- `get_or_create_session()` function
- `trim_conversation()` function

**Added:**
- `startup()` event → calls `init_db()` on server start
- `build_system_prompt(user_id)` → reads facts from DB and injects them into the system prompt
- `trim_messages(messages)` → trims message list to last 20 exchanges (same logic, but operates on a list instead of modifying a shared dict)
- `extract_facts_from_messages(user_id, messages)` → every 3rd user message, asks the LLM to extract facts and stores them
- New endpoints: `GET /chat/{session_id}/messages` and `GET /sessions/{user_id}`

**Updated endpoints:**
- `POST /chat` now accepts `user_id` field
- `POST /reset` now accepts `user_id` field (for future use)

### 3.3 Modified: `frontend/src/App.jsx`

**Removed:**
- `import SpidermanAnimation from "./SpidermanAnimation"`
- `<SpidermanAnimation />` JSX
- All decorative `.deco-side` figure elements

**Added:**
- Persistent `userId` from `localStorage` (survives tab close/reopen)
- Sidebar with "New Chat" button + conversation history list
- Hamburger menu button (☰) to toggle sidebar
- Session switching — clicking a past session loads its messages
- Chat bubble layout: user messages on right (blue), assistant on left (gray)

**State changes:**
- `sessionId` is now state (was const) to allow switching between sessions
- Added `sessions` state for sidebar list
- Added `sidebarOpen` state for toggling sidebar
- API calls now include `user_id`

### 3.4 Rewritten: `frontend/src/App.css`

Removed all old styles (decorations, container, reply-box, spiderman-canvas)
and replaced with sidebar + chat bubble layout.

---

## 4. UI Layout

```
┌──────────────┬─────────────────────────────────┐
│  Sidebar     │  ☰       AI made by AI          │
│  ──────────  │  ─────────────────────────────  │
│  [+ New Chat]│                                 │
│              │     ┌──────────────────────┐    │
│  Hello world │     │  Hi there! (gray)    │    │
│  What is AI  │     └──────────────────────┘    │
│  How to code │          ┌──────────────────┐   │
│              │          │  Tell me about X │   │
│              │          │  (blue, right)   │   │
│              │          └──────────────────┘   │
│              │     ┌──────────────────────┐    │
│              │     │  Sure! Let me expl... │    │
│              │     └──────────────────────┘    │
│              │                                 │
│              │  [Type your message...] [Send]  │
└──────────────┴─────────────────────────────────┘
```

- **Sidebar**: Fixed 260px width, toggle-visible with ☰ button
- **Header**: Centered title "AI made by AI"
- **Chat bubbles**: User on right (blue, `border-radius: 18px 18px 4px 18px`),
  Assistant on left (gray, `border-radius: 18px 18px 18px 4px`)
- **Input bar**: Fixed at bottom

---

## 5. Fact Extraction System

Every 3rd user message (`FACT_EXTRACT_INTERVAL = 3`), the backend sends
the recent conversation to the LLM with this system prompt:

```
Extract personal facts about the user from the conversation below.
Return ONLY a JSON object with key-value pairs.
Example: {"user_name": "Alice", "favorite_color": "blue"}.
If no new facts, return {}.
```

Extracted facts are upserted into the `facts` table. On every subsequent
chat request, all known facts are injected into the system prompt:

```
You are a helpful assistant.

Known facts about the user:
- user_name: Alice
- favorite_color: blue
```

This allows the chatbot to remember user details across sessions.

---

## 6. Configuration

| Constant | File | Default | Description |
|---|---|---|---|
| `MAX_EXCHANGES` | `backend/main.py:25` | 20 | Max user-assistant pairs sent to LLM (older messages trimmed) |
| `FACT_EXTRACT_INTERVAL` | `backend/main.py:26` | 3 | Extract facts every N user messages |
| `DB_PATH` | `backend/memory_store.py:6` | `backend/chat_memory.db` | SQLite database file location |

---

## 7. Files Changed Summary

| File | Status |
|---|---|
| `backend/memory_store.py` | **NEW** |
| `backend/main.py` | Modified |
| `frontend/src/App.jsx` | Modified |
| `frontend/src/App.css` | Rewritten |
| `frontend/src/SpidermanAnimation.jsx` | **DELETED** |
| `docs/memory-implementation.md` | **NEW** |
