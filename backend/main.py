import os
import re
import json
import secrets
import hashlib
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from memory_store import (
    init_db,
    create_session,
    save_message,
    get_conversation,
    reset_conversation,
    delete_session,
    rename_session,
    get_all_facts,
    upsert_fact,
    get_user_sessions,
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_last_login,
    create_token,
    get_user_by_token,
    delete_token,
    delete_tokens_for_user,
    set_user_blocked,
    list_all_users,
    get_session_user,
)
from tools import route_tool
from rag import retrieve

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_EXCHANGES = 20
FACT_EXTRACT_INTERVAL = 3
RAG_TOP_K = 3

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$")
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
        ).hex()
        return secrets.compare_digest(digest, expected)
    except Exception:
        return False


def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[len("Bearer "):].strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if user["is_blocked"]:
        raise HTTPException(status_code=403, detail="Account is blocked")
    return user


def require_admin(x_admin_key: str = Header(None)) -> None:
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin is not configured")
    if x_admin_key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return None

RAG_SYSTEM_PROMPT = """You are a company assistant. Answer the user's question using ONLY the information in the provided context below.

Rules:
- Base your answer strictly on the context. Do not use outside knowledge.
- If the answer cannot be found in the context, say "I don't have that information."
- Never invent data, statistics, or sources. Only reference sources actually listed below.
- Keep the answer concise and natural.

Context:
{context}"""

RAG_TAG = "@company"

RAG_NOT_FOUND = (
    "I couldn't find that in the company documents. "
    "Try asking about products, finances, suppliers, or the executive team."
)


def build_context(retrieval: list[dict]) -> str:
    return "\n\n".join(
        f"[Source: {r['source']}]\n{r['text']}" for r in retrieval
    )


def strip_rag_tag(message: str) -> tuple[str, bool]:
    """Return (cleaned_message, uses_rag). Detects @company anywhere (case-insensitive)."""
    lowered = message.lower()
    if RAG_TAG in lowered:
        cleaned = re.sub(re.escape(RAG_TAG), "", message, flags=re.IGNORECASE)
        return cleaned.strip(), True
    return message, False


@app.on_event("startup")
def startup():
    init_db()


def build_system_prompt(user_id: str) -> str:
    facts = get_all_facts(user_id)
    if facts:
        facts_str = "\n".join(f"- {k}: {v}" for k, v in facts.items())
        return f"You are a helpful assistant.\n\nKnown facts about the user:\n{facts_str}"
    return "You are a helpful assistant."


def trim_messages(messages: list[dict]) -> list[dict]:
    system = [messages[0]] if messages and messages[0]["role"] == "system" else []
    rest = messages[len(system):]
    if len(rest) > MAX_EXCHANGES * 2:
        rest = rest[-(MAX_EXCHANGES * 2):]
    return system + rest


def extract_facts_from_messages(user_id: str, messages: list[dict]):
    user_msgs = [m for m in messages if m["role"] == "user"]
    if len(user_msgs) == 0 or len(user_msgs) % FACT_EXTRACT_INTERVAL != 0:
        return
    recent = messages[-FACT_EXTRACT_INTERVAL * 2:]
    try:
        completion = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "system",
                    "content": "Extract personal facts about the user from the conversation below. "
                    "Return ONLY a JSON object with key-value pairs. "
                    'Example: {"user_name": "Alice", "favorite_color": "blue"}. '
                    "If no new facts, return {}.",
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        [
                            {"role": m["role"], "content": m["content"]}
                            for m in recent
                        ]
                    ),
                },
            ],
        )
        text = completion.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        facts = json.loads(text)
        for key, value in facts.items():
            upsert_fact(user_id, key, str(value))
    except Exception:
        pass


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str


class AuthRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: int
    email: str


class MeResponse(BaseModel):
    user_id: int
    email: str


class AdminUser(BaseModel):
    id: int
    email: str
    is_blocked: int
    created_at: str | None = None
    last_login: str | None = None
    message_count: int


class AdminUsersResponse(BaseModel):
    users: list[AdminUser]


class BlockRequest(BaseModel):
    blocked: bool


class ResetRequest(BaseModel):
    session_id: str
    user_id: str


class ResetResponse(BaseModel):
    status: str


class MessagesResponse(BaseModel):
    messages: list[dict]


class SessionListResponse(BaseModel):
    sessions: list[dict]


class RenameRequest(BaseModel):
    title: str


class RenameResponse(BaseModel):
    status: str


class DeleteResponse(BaseModel):
    status: str


@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    user_id = str(user["id"])
    create_session(req.session_id, user_id)
    system_prompt = build_system_prompt(user_id)
    history = get_conversation(req.session_id)

    clean_message, uses_rag = strip_rag_tag(req.message)
    if not clean_message:
        clean_message = req.message

    save_message(req.session_id, user_id, "user", clean_message)

    tool_result = route_tool(clean_message)
    if tool_result:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": clean_message},
            {
                "role": "system",
                "content": f"The {tool_result['tool']} tool returned: {json.dumps(tool_result['result'])}. "
                "Answer the user's question naturally using this data.",
            },
        ]

        trimmed = trim_messages(messages)

        completion = client.chat.completions.create(
            model="openrouter/free",
            messages=trimmed,
        )
        reply = completion.choices[0].message.content
    elif uses_rag:
        retrieval = retrieve(clean_message, k=RAG_TOP_K, client=client)
        if retrieval:
            messages = [
                {
                    "role": "system",
                    "content": RAG_SYSTEM_PROMPT.format(
                        context=build_context(retrieval)
                    ),
                },
                *history,
                {"role": "user", "content": clean_message},
            ]

            trimmed = trim_messages(messages)

            completion = client.chat.completions.create(
                model="openrouter/free",
                messages=trimmed,
            )
            reply = completion.choices[0].message.content
        else:
            reply = RAG_NOT_FOUND
    else:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": clean_message},
        ]

        trimmed = trim_messages(messages)

        completion = client.chat.completions.create(
            model="openrouter/free",
            messages=trimmed,
        )
        reply = completion.choices[0].message.content

    save_message(req.session_id, user_id, "assistant", reply)

    all_msgs = history + [
        {"role": "user", "content": clean_message},
        {"role": "assistant", "content": reply},
    ]
    extract_facts_from_messages(user_id, all_msgs)

    return ChatResponse(reply=reply)


@app.post("/reset", response_model=ResetResponse)
def reset(req: ResetRequest, user: dict = Depends(get_current_user)):
    owner = get_session_user(req.session_id)
    if owner and owner != str(user["id"]):
        raise HTTPException(status_code=403, detail="Not your session")
    reset_conversation(req.session_id)
    return ResetResponse(status="ok")


@app.get("/chat/{session_id}/messages", response_model=MessagesResponse)
def get_messages(session_id: str, user: dict = Depends(get_current_user)):
    owner = get_session_user(session_id)
    if owner and owner != str(user["id"]):
        raise HTTPException(status_code=403, detail="Not your session")
    messages = get_conversation(session_id)
    return MessagesResponse(messages=messages)


@app.get("/sessions", response_model=SessionListResponse)
def list_sessions(user: dict = Depends(get_current_user)):
    sessions = get_user_sessions(str(user["id"]))
    return SessionListResponse(sessions=sessions)


@app.delete("/chat/{session_id}", response_model=DeleteResponse)
def delete_chat(session_id: str, user: dict = Depends(get_current_user)):
    owner = get_session_user(session_id)
    if owner and owner != str(user["id"]):
        raise HTTPException(status_code=403, detail="Not your session")
    delete_session(session_id)
    return DeleteResponse(status="ok")


@app.patch("/chat/{session_id}/rename", response_model=RenameResponse)
def rename_chat(
    session_id: str, req: RenameRequest, user: dict = Depends(get_current_user)
):
    owner = get_session_user(session_id)
    if owner and owner != str(user["id"]):
        raise HTTPException(status_code=403, detail="Not your session")
    rename_session(session_id, req.title)
    return RenameResponse(status="ok")


@app.post("/auth/register", response_model=AuthResponse)
def register(req: AuthRequest):
    email = req.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = create_user(email, hash_password(req.password))
    token = secrets.token_urlsafe(32)
    create_token(token, user_id)
    update_last_login(user_id)
    return AuthResponse(token=token, user_id=user_id, email=email)


@app.post("/auth/login", response_model=AuthResponse)
def login(req: AuthRequest):
    email = req.email.strip().lower()
    user = get_user_by_email(email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["is_blocked"]:
        raise HTTPException(status_code=403, detail="Account is blocked")
    token = secrets.token_urlsafe(32)
    create_token(token, user["id"])
    update_last_login(user["id"])
    return AuthResponse(token=token, user_id=user["id"], email=user["email"])


@app.get("/auth/me", response_model=MeResponse)
def me(user: dict = Depends(get_current_user)):
    return MeResponse(user_id=user["id"], email=user["email"])


@app.post("/auth/logout")
def logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        delete_token(authorization[len("Bearer "):].strip())
    return {"status": "ok"}


@app.get("/admin/users", response_model=AdminUsersResponse)
def admin_users(_: None = Depends(require_admin)):
    return AdminUsersResponse(users=list_all_users())


@app.post("/admin/users/{user_id}/block")
def admin_block(user_id: int, req: BlockRequest, _: None = Depends(require_admin)):
    if not get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    set_user_blocked(user_id, req.blocked)
    if req.blocked:
        delete_tokens_for_user(user_id)
    return {"status": "ok"}


@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    return ADMIN_HTML


ADMIN_HTML = """
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Admin - AI Chat</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif;
    background: #f0f2f5; color: #222;
  }
  .card {
    max-width: 860px; margin: 0 auto; background: #fff;
    border-radius: 12px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.12);
  }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: #777; font-size: 13px; margin: 0 0 20px; }
  .key-row { display: flex; gap: 8px; margin-bottom: 20px; }
  .key-row input {
    flex: 1; padding: 10px 12px; font-size: 15px; border: 1px solid #ccc;
    border-radius: 8px;
  }
  button {
    padding: 10px 16px; font-size: 14px; border: none; border-radius: 8px;
    cursor: pointer; background: #007bff; color: #fff;
  }
  button.secondary { background: #e0e2e6; color: #333; }
  .error { color: #dc3545; font-size: 14px; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eee; }
  th { color: #555; font-weight: 600; }
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600;
  }
  .badge.blocked { background: #fdecea; color: #c0392b; }
  .badge.active { background: #e8f5e9; color: #2e7d32; }
  .btn-block { background: #c0392b; }
  .btn-unblock { background: #2e7d32; }
  .empty { color: #888; text-align: center; padding: 30px; }
  @media (max-width: 600px) {
    .card { padding: 16px; }
    .key-row { flex-direction: column; }
  }
</style>
</head>
<body>
  <div class="card">
    <h1>Admin Panel</h1>
    <p class="sub">Manage user accounts for AI made by AI</p>
    <div class="key-row">
      <input type="password" id="key" placeholder="Admin key" autocomplete="off" />
      <button onclick="loadUsers()">Unlock</button>
    </div>
    <div class="error" id="error"></div>
    <table id="table" style="display:none">
      <thead>
        <tr><th>ID</th><th>Email</th><th>Messages</th><th>Created</th><th>Last login</th><th>Status</th><th></th></tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="empty" id="empty" style="display:none">No users yet.</div>
  </div>
<script>
  let key = localStorage.getItem("admin-key") || "";
  document.getElementById("key").value = key;
  if (key) loadUsers();

  async function api(url, options) {
    key = document.getElementById("key").value.trim() || localStorage.getItem("admin-key");
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Admin-Key": key },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || ("HTTP " + res.status));
    return data;
  }

  async function loadUsers() {
    const err = document.getElementById("error");
    err.textContent = "";
    const keyInput = document.getElementById("key").value.trim();
    if (!keyInput) { err.textContent = "Enter the admin key."; return; }
    try {
      const data = await api("/admin/users");
      localStorage.setItem("admin-key", keyInput);
      renderUsers(data.users || []);
    } catch (e) {
      err.textContent = "Failed: " + e.message;
    }
  }

  function renderUsers(users) {
    const table = document.getElementById("table");
    const rows = document.getElementById("rows");
    const empty = document.getElementById("empty");
    if (!users.length) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }
    table.style.display = "table";
    empty.style.display = "none";
    rows.innerHTML = users.map(u => {
      const blocked = !!u.is_blocked;
      const created = (u.created_at || "").replace("T", " ").slice(0, 16);
      const last = (u.last_login || "-").replace("T", " ").slice(0, 16);
      return `<tr>
        <td>${u.id}</td>
        <td>${u.email}</td>
        <td>${u.message_count ?? 0}</td>
        <td>${created}</td>
        <td>${last}</td>
        <td><span class="badge ${blocked ? "blocked" : "active"}">${blocked ? "Blocked" : "Active"}</span></td>
        <td><button class="${blocked ? "btn-unblock" : "btn-block"}" onclick="toggleBlock(${u.id}, ${!blocked})">${blocked ? "Unblock" : "Block"}</button></td>
      </tr>`;
    }).join("");
  }

  async function toggleBlock(userId, blocked) {
    const err = document.getElementById("error");
    err.textContent = "";
    try {
      await api("/admin/users/" + userId + "/block", { method: "POST", body: JSON.stringify({ blocked }) });
      loadUsers();
    } catch (e) {
      err.textContent = "Failed: " + e.message;
    }
  }
</script>
</body>
</html>
"""
