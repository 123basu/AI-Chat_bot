import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

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

conversations: dict[str, list[dict]] = {}


def get_or_create_session(session_id: str) -> list[dict]:
    if session_id not in conversations:
        conversations[session_id] = [
            {"role": "system", "content": "You are a helpful assistant."}
        ]
    return conversations[session_id]


def trim_conversation(history: list[dict]):
    system = [history[0]] if history and history[0]["role"] == "system" else []
    messages = history[len(system):]
    if len(messages) > MAX_EXCHANGES * 2:
        messages = messages[-(MAX_EXCHANGES * 2):]
    history.clear()
    history.extend(system + messages)


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str


class ResetRequest(BaseModel):
    session_id: str


class ResetResponse(BaseModel):
    status: str


@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    history = get_or_create_session(req.session_id)
    history.append({"role": "user", "content": req.message})
    trim_conversation(history)
    completion = client.chat.completions.create(
        model="openrouter/free",
        messages=history,
    )
    reply = completion.choices[0].message.content
    history.append({"role": "assistant", "content": reply})
    return ChatResponse(reply=reply)


@app.post("/reset", response_model=ResetResponse)
def reset(req: ResetRequest):
    if req.session_id in conversations:
        conversations[req.session_id] = [
            {"role": "system", "content": "You are a helpful assistant."}
        ]
    return ResetResponse(status="ok")
