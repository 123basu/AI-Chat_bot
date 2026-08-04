import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "chat_memory.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            fact_key TEXT NOT NULL,
            fact_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, fact_key)
        );

        CREATE TABLE IF NOT EXISTS chunk_embeddings (
            source TEXT NOT NULL,
            chunk_id INTEGER NOT NULL,
            embedding TEXT NOT NULL,
            PRIMARY KEY (source, chunk_id)
        );

        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
        CREATE INDEX IF NOT EXISTS idx_facts_user ON facts(user_id);
    """)
    conn.commit()
    conn.close()


def create_session(session_id: str, user_id: str):
    conn = get_connection()
    conn.execute(
        "INSERT OR IGNORE INTO sessions (session_id, user_id) VALUES (?, ?)",
        (session_id, user_id),
    )
    conn.commit()
    conn.close()


def save_message(session_id: str, user_id: str, role: str, content: str):
    conn = get_connection()
    conn.execute(
        "INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)",
        (session_id, user_id, role, content),
    )
    conn.commit()
    conn.close()


def get_conversation(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
        (session_id,),
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def get_user_sessions(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """SELECT s.session_id, s.title as custom_title, s.created_at,
                  (SELECT content FROM messages WHERE session_id = s.session_id AND role = 'user' ORDER BY id LIMIT 1) as first_message
           FROM sessions s
           WHERE s.user_id = ?
           ORDER BY s.created_at DESC""",
        (user_id,),
    ).fetchall()
    conn.close()
    return [
        {
            "session_id": r["session_id"],
            "title": r["custom_title"] or r["first_message"] or "New Chat",
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def reset_conversation(session_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()


def delete_session(session_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()


def rename_session(session_id: str, title: str):
    conn = get_connection()
    conn.execute(
        "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
        (title, session_id),
    )
    conn.commit()
    conn.close()


def upsert_fact(user_id: str, key: str, value: str):
    conn = get_connection()
    conn.execute(
        """INSERT INTO facts (user_id, fact_key, fact_value, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, fact_key)
           DO UPDATE SET fact_value = excluded.fact_value, updated_at = CURRENT_TIMESTAMP""",
        (user_id, key, value),
    )
    conn.commit()
    conn.close()


def get_all_facts(user_id: str) -> dict:
    conn = get_connection()
    rows = conn.execute(
        "SELECT fact_key, fact_value FROM facts WHERE user_id = ?", (user_id,)
    ).fetchall()
    conn.close()
    return {r["fact_key"]: r["fact_value"] for r in rows}


def get_chunk_embedding(source: str, chunk_id: int) -> list[float] | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT embedding FROM chunk_embeddings WHERE source = ? AND chunk_id = ?",
        (source, chunk_id),
    ).fetchone()
    conn.close()
    if row:
        return json.loads(row["embedding"])
    return None


def save_chunk_embedding(source: str, chunk_id: int, embedding: list[float]):
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO chunk_embeddings (source, chunk_id, embedding) VALUES (?, ?, ?)",
        (source, chunk_id, json.dumps(embedding)),
    )
    conn.commit()
    conn.close()
