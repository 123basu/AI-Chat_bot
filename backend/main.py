import os
import json
from fastapi import FastAPI
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
)
from tools import route_tool

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
    user_id: str


class ChatResponse(BaseModel):
    reply: str


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
def chat(req: ChatRequest):
    create_session(req.session_id, req.user_id)
    system_prompt = build_system_prompt(req.user_id)
    history = get_conversation(req.session_id)

    save_message(req.session_id, req.user_id, "user", req.message)

    tool_result = route_tool(req.message)
    if tool_result:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": req.message},
            {
                "role": "system",
                "content": f"The {tool_result['tool']} tool returned: {json.dumps(tool_result['result'])}. "
                "Answer the user's question naturally using this data.",
            },
        ]
    else:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": req.message},
        ]

    trimmed = trim_messages(messages)

    completion = client.chat.completions.create(
        model="openrouter/free",
        messages=trimmed,
    )
    reply = completion.choices[0].message.content

    save_message(req.session_id, req.user_id, "assistant", reply)

    all_msgs = history + [
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": reply},
    ]
    extract_facts_from_messages(req.user_id, all_msgs)

    return ChatResponse(reply=reply)


@app.post("/reset", response_model=ResetResponse)
def reset(req: ResetRequest):
    reset_conversation(req.session_id)
    return ResetResponse(status="ok")


@app.get("/chat/{session_id}/messages", response_model=MessagesResponse)
def get_messages(session_id: str):
    messages = get_conversation(session_id)
    return MessagesResponse(messages=messages)


@app.get("/sessions/{user_id}", response_model=SessionListResponse)
def list_sessions(user_id: str):
    sessions = get_user_sessions(user_id)
    return SessionListResponse(sessions=sessions)


@app.delete("/chat/{session_id}", response_model=DeleteResponse)
def delete_chat(session_id: str):
    delete_session(session_id)
    return DeleteResponse(status="ok")


@app.patch("/chat/{session_id}/rename", response_model=RenameResponse)
def rename_chat(session_id: str, req: RenameRequest):
    rename_session(session_id, req.title)
    return RenameResponse(status="ok")
