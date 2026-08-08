import os
import json

DATABASE_URL = os.getenv("DATABASE_URL", "")
IS_PG = bool(DATABASE_URL)

DB_PATH = os.path.join(os.path.dirname(__file__), "chat_memory.db")


def _build_pg_dsn() -> str:
    """Normalize the DATABASE_URL DSN so connections are reliable on free tiers."""
    dsn = DATABASE_URL
    sep = "" if "?" in dsn else "?"
    params = [
        "connect_timeout=10",
        "keepalives=1",
        "keepalives_idle=30",
        "keepalives_interval=60",
        "keepalives_count=5",
    ]
    if "sslmode" not in dsn and "localhost" not in dsn and "127.0.0.1" not in dsn:
        params.append("sslmode=require")
    return dsn + sep + "&".join(params)


def get_connection():
    """Return a connection-like object. PG when DATABASE_URL set, else SQLite."""
    if IS_PG:
        import psycopg2

        conn = psycopg2.connect(_build_pg_dsn())
        conn.autocommit = True
        return _PGConn(conn)
    else:
        import sqlite3

        conn = sqlite3.connect(
            DB_PATH, timeout=30, check_same_thread=False, isolation_level=None
        )
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL")
        except Exception:
            pass
        return _SQLiteConn(conn)


class _PGConn:
    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=None, returning=False):
        cur = self.raw.cursor()
        cur.execute(sql, params or ())
        if returning:
            row = cur.fetchone()
            cur.close()
            return row[0] if row else None
        cur.close()
        return None

    def query(self, sql, params=None):
        cur = self.raw.cursor()
        cur.execute(sql, params or ())
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        else:
            rows = []
        cur.close()
        return rows

    def query_one(self, sql, params=None):
        cur = self.raw.cursor()
        cur.execute(sql, params or ())
        row = None
        if cur.description:
            cols = [d[0] for d in cur.description]
            r = cur.fetchone()
            row = dict(zip(cols, r)) if r else None
        cur.close()
        return row


class _SQLiteConn:
    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=None, returning=False):
        cur = self.raw.execute(sql, params or ())
        if returning and cur.lastrowid is not None:
            return cur.lastrowid
        return None

    def query(self, sql, params=None):
        cur = self.raw.execute(sql, params or ())
        rows = cur.fetchall()
        return [dict(r) for r in rows]

    def query_one(self, sql, params=None):
        cur = self.raw.execute(sql, params or ())
        row = cur.fetchone()
        return dict(row) if row else None


def _close(conn):
    if isinstance(conn, (str, int)) or conn is None:
        return
    try:
        conn.raw.close()
    except Exception:
        pass


def get_conn():
    """Compatibility alias for callers that just want a raw connection."""
    return get_connection()


from contextlib import contextmanager


@contextmanager
def _connection():
    """Always-release connection. Prevents pool/file leaks on exceptions."""
    conn = get_connection()
    try:
        yield conn
    finally:
        _close(conn)


def init_db():
    if IS_PG:
        stmts = [
            "CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())",
            "CREATE TABLE IF NOT EXISTS messages (id BIGSERIAL PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())",
            "CREATE TABLE IF NOT EXISTS facts (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, fact_key TEXT NOT NULL, fact_value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, fact_key))",
            "CREATE TABLE IF NOT EXISTS chunk_embeddings (source TEXT NOT NULL, chunk_id INTEGER NOT NULL, embedding TEXT NOT NULL, PRIMARY KEY (source, chunk_id))",
            "CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT, name TEXT, is_blocked INTEGER NOT NULL DEFAULT 0, auth_provider TEXT NOT NULL DEFAULT 'password', created_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ)",
            "CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT now())",
            "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_facts_user ON facts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id)",
        ]
    else:
        stmts = [
            "CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS facts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, fact_key TEXT NOT NULL, fact_value TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, fact_key))",
            "CREATE TABLE IF NOT EXISTS chunk_embeddings (source TEXT NOT NULL, chunk_id INTEGER NOT NULL, embedding TEXT NOT NULL, PRIMARY KEY (source, chunk_id))",
            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT, name TEXT, is_blocked INTEGER NOT NULL DEFAULT 0, auth_provider TEXT NOT NULL DEFAULT 'password', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_login TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_facts_user ON facts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id)",
        ]
    with _connection() as conn:
        for st in stmts:
            conn.execute(st)


# -------------------- sessions / messages --------------------

def create_session(session_id, user_id):
    with _connection() as conn:
        if IS_PG:
            conn.execute("INSERT INTO sessions (session_id, user_id) VALUES (%s, %s) ON CONFLICT (session_id) DO NOTHING", (session_id, user_id))
        else:
            conn.execute("INSERT OR IGNORE INTO sessions (session_id, user_id) VALUES (?, ?)", (session_id, user_id))


def save_message(session_id, user_id, role, content):
    with _connection() as conn:
        pl = ["%s", "%s", "%s", "%s"] if IS_PG else ["?", "?", "?", "?"]
        conn.execute(f"INSERT INTO messages (session_id, user_id, role, content) VALUES ({', '.join(pl)})", (session_id, user_id, role, content))


def get_conversation(session_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        rows = conn.query(f"SELECT role, content FROM messages WHERE session_id = {ph} ORDER BY id", (session_id,))
        return [{"role": r["role"], "content": r["content"]} for r in rows]


def get_user_sessions(user_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        rows = conn.query(
            f"""SELECT s.session_id, s.title as custom_title, s.created_at,
                       (SELECT content FROM messages WHERE session_id = s.session_id AND role = 'user' ORDER BY id LIMIT 1) as first_message
                FROM sessions s WHERE s.user_id = {ph} ORDER BY s.created_at DESC""",
            (user_id,),
        )
        return [
            {
                "session_id": r["session_id"],
                "title": r["custom_title"] or r["first_message"] or "New Chat",
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]


def reset_conversation(session_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        conn.execute(f"DELETE FROM messages WHERE session_id = {ph}", (session_id,))


def delete_session(session_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        conn.execute(f"DELETE FROM messages WHERE session_id = {ph}", (session_id,))
        conn.execute(f"DELETE FROM sessions WHERE session_id = {ph}", (session_id,))


def rename_session(session_id, title):
    with _connection() as conn:
        ts = "now()" if IS_PG else "CURRENT_TIMESTAMP"
        pl = ["%s", "%s"] if IS_PG else ["?", "?"]
        conn.execute(f"UPDATE sessions SET title = {pl[0]}, updated_at = {ts} WHERE session_id = {pl[1]}", (title, session_id))


def get_session_user(session_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        row = conn.query_one(f"SELECT user_id FROM sessions WHERE session_id = {ph}", (session_id,))
        return row["user_id"] if row else None


# -------------------- facts --------------------

def upsert_fact(user_id, key, value):
    with _connection() as conn:
        if IS_PG:
            conn.execute(
                """INSERT INTO facts (user_id, fact_key, fact_value, updated_at) VALUES (%s, %s, %s, now())
                   ON CONFLICT (user_id, fact_key) DO UPDATE SET fact_value = EXCLUDED.fact_value, updated_at = now()""",
                (user_id, key, value),
            )
        else:
            conn.execute(
                """INSERT INTO facts (user_id, fact_key, fact_value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(user_id, fact_key) DO UPDATE SET fact_value = excluded.fact_value, updated_at = CURRENT_TIMESTAMP""",
                (user_id, key, value),
            )


def get_all_facts(user_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        rows = conn.query(f"SELECT fact_key, fact_value FROM facts WHERE user_id = {ph}", (user_id,))
        return {r["fact_key"]: r["fact_value"] for r in rows}


# -------------------- users --------------------

def create_user(email, password_hash=None, name=None, provider="password"):
    with _connection() as conn:
        if IS_PG:
            cur = conn.raw.cursor()
            cur.execute(
                "INSERT INTO users (email, password_hash, name, auth_provider) VALUES (%s, %s, %s, %s) RETURNING id",
                (email, password_hash, name, provider),
            )
            user_id = cur.fetchone()[0]
            cur.close()
        else:
            conn.execute(
                "INSERT INTO users (email, password_hash, name, auth_provider) VALUES (?, ?, ?, ?)",
                (email, password_hash, name, provider),
            )
            cur = conn.raw.execute("SELECT last_insert_rowid()")
            user_id = cur.fetchone()[0]
        return user_id


def get_user_by_email(email):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        return conn.query_one(
            f"SELECT id, email, password_hash, is_blocked, created_at, last_login, auth_provider FROM users WHERE email = {ph}",
            (email,),
        )


def get_user_by_id(user_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        return conn.query_one(
            f"SELECT id, email, is_blocked, created_at, last_login, auth_provider FROM users WHERE id = {ph}",
            (user_id,),
        )


def update_last_login(user_id):
    with _connection() as conn:
        ts = "now()" if IS_PG else "CURRENT_TIMESTAMP"
        ph = "%s" if IS_PG else "?"
        conn.execute(f"UPDATE users SET last_login = {ts} WHERE id = {ph}", (user_id,))


def set_user_blocked(user_id, blocked):
    with _connection() as conn:
        pl = ["%s", "%s"] if IS_PG else ["?", "?"]
        conn.execute(f"UPDATE users SET is_blocked = {pl[0]} WHERE id = {pl[1]}", (1 if blocked else 0, user_id))


def list_all_users():
    with _connection() as conn:
        msgs_user_id = "m.user_id::int" if IS_PG else "m.user_id"
        return conn.query(
            f"""SELECT u.id, u.email, u.is_blocked, u.created_at, u.last_login, u.auth_provider,
                      (SELECT COUNT(*) FROM messages m WHERE {msgs_user_id} = u.id) as message_count
               FROM users u ORDER BY u.created_at DESC""",
        )


# -------------------- tokens --------------------

def create_token(token, user_id):
    with _connection() as conn:
        pl = ["%s", "%s"] if IS_PG else ["?", "?"]
        conn.execute(f"INSERT INTO tokens (token, user_id) VALUES ({pl[0]}, {pl[1]})", (token, user_id))


def get_user_by_token(token):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        return conn.query_one(
            f"""SELECT u.id, u.email, u.is_blocked, u.created_at, u.last_login
                FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = {ph}""",
            (token,),
        )


def delete_token(token):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        conn.execute(f"DELETE FROM tokens WHERE token = {ph}", (token,))


def delete_tokens_for_user(user_id):
    with _connection() as conn:
        ph = "%s" if IS_PG else "?"
        conn.execute(f"DELETE FROM tokens WHERE user_id = {ph}", (user_id,))


# -------------------- embeddings --------------------

def get_chunk_embedding(source, chunk_id):
    with _connection() as conn:
        pl = ["%s", "%s"] if IS_PG else ["?", "?"]
        row = conn.query_one(
            f"SELECT embedding FROM chunk_embeddings WHERE source = {pl[0]} AND chunk_id = {pl[1]}",
            (source, chunk_id),
        )
        return json.loads(row["embedding"]) if row else None


def save_chunk_embedding(source, chunk_id, embedding):
    with _connection() as conn:
        if IS_PG:
            conn.execute(
                "INSERT INTO chunk_embeddings (source, chunk_id, embedding) VALUES (%s, %s, %s) "
                "ON CONFLICT (source, chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding",
                (source, chunk_id, json.dumps(embedding)),
            )
        else:
            conn.execute(
                "INSERT OR REPLACE INTO chunk_embeddings (source, chunk_id, embedding) VALUES (?, ?, ?)",
                (source, chunk_id, json.dumps(embedding)),
            )