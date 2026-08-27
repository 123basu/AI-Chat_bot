import os
import re
import json
import sqlite3

from llm import chat_completion

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")
MAX_ROWS = 200

DATA_SYSTEM_PROMPT = """You are a SQLite query generator. Given a question, output a SQL query.

Schema:
{schema}

Rules:
- Output ONLY the SQL query, starting with SELECT. No explanations.
- Respect table and column names exactly as shown.
- Only SELECT queries allowed.
- Use SUM, COUNT, GROUP BY, ORDER BY, LIMIT as needed.

Examples:
SELECT SUM(total_quoted_value) FROM quotations
SELECT client_name, total_quoted_value FROM quotations WHERE status = 'completed'
SELECT q.client_name, e.category, SUM(e.amount) FROM expense_entries e JOIN quotations q ON e.quotation_id = q.id GROUP BY e.category"""

EXPLAIN_SYSTEM_PROMPT = """You are a business data analyst. The user asked a question about their business data. You receive the SQL query result and need to answer the question in plain English.

Question: {question}

SQL query result: {result}

Instructions:
- Answer the question directly using the data.
- State numbers clearly. Use commas for large numbers.
- If the result is empty, say "No data found."
- Be concise and natural. Do NOT mention SQL, queries, or technical details.
- Do NOT add safety warnings or disclaimers."""


def get_schema() -> str:
    if not os.path.exists(DB_PATH):
        return ""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    parts = []
    for t in tables:
        name = t["name"]
        parts.append(f"Table: {name}")
        cursor.execute(f'PRAGMA table_info("{name}")')
        cols = cursor.fetchall()
        for col in cols:
            parts.append(f"  {col['name']} ({col['type']})")
        parts.append("")
    conn.close()
    return "\n".join(parts).strip()


def _extract_sql(text: str) -> str | None:
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r"```sql\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()
    # Find a SELECT statement
    match = re.search(r"(SELECT\s+.+)", text, re.IGNORECASE | re.DOTALL)
    if match:
        sql = match.group(1).strip()
        if sql.endswith(";") and not sql.endswith(";;"):
            sql = sql[:-1]
        return sql
    if text.upper().startswith("SELECT"):
        return text
    return None


def is_safe_sql(sql: str) -> bool:
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        return False
    blocked = re.findall(
        r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|ATTACH|DETACH|PRAGMA|REINDEX|REPLACE|TRUNCATE|VACUUM)\b",
        stripped,
    )
    return len(blocked) == 0


def generate_sql(question: str, schema: str) -> str:
    prompt = DATA_SYSTEM_PROMPT.format(schema=schema)
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Question: {question}\n\nSQL query:"},
    ]
    reply = chat_completion(messages, max_tokens=1024)
    sql = _extract_sql(reply)
    if not sql:
        messages.append({"role": "assistant", "content": reply})
        messages.append({
            "role": "user",
            "content": "Output ONLY a SELECT SQL query. No explanations:",
        })
        reply = chat_completion(messages, max_tokens=1024)
        sql = _extract_sql(reply)
    if not sql:
        raise ValueError(f"LLM did not return a valid SQL query. Response: {reply}")
    return sql


def execute_sql(sql: str) -> dict:
    if not os.path.exists(DB_PATH):
        return {"columns": [], "rows": [], "error": "Database file not found"}
    if not is_safe_sql(sql):
        return {"columns": [], "rows": [], "error": "Only SELECT queries are allowed"}
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        cols = [d[0] for d in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(MAX_ROWS + 1)
        limited = len(rows) > MAX_ROWS
        rows = rows[:MAX_ROWS]
        result = {
            "columns": cols,
            "rows": [list(r) for r in rows],
            "limited": limited,
        }
        return result
    except Exception as e:
        return {"columns": [], "rows": [], "error": str(e)}
    finally:
        conn.close()


def explain_result(question: str, sql: str, result: dict) -> str:
    result_str = json.dumps(result, default=str)
    if len(result_str) > 8000:
        result_str = result_str[:8000] + "... [truncated]"
    prompt = EXPLAIN_SYSTEM_PROMPT.format(question=question, result=result_str)
    messages = [
        {"role": "system", "content": prompt},
    ]
    return chat_completion(messages, max_tokens=1024)


def handle_data_query(question: str) -> str:
    try:
        schema = get_schema()
        if not schema:
            return "I couldn't access the database. Please make sure the database file exists."

        try:
            sql = generate_sql(question, schema)
        except ValueError as e:
            return f"I couldn't generate a proper query for that. Please try rephrasing your question. ({e})"

        result = execute_sql(sql)
        if result.get("error"):
            error_msg = result["error"]
            # Try once more with error feedback
            retry_prompt = (
                f"I tried this SQL but got an error: {sql}\nError: {error_msg}\n"
                f"Fix the SQL query. End your response with the corrected SQL starting with SELECT."
            )
            messages = [
                {"role": "system", "content": DATA_SYSTEM_PROMPT.format(schema=schema)},
                {"role": "user", "content": f"Question: {question}\n\n{retry_prompt}"},
            ]
            reply = chat_completion(messages, max_tokens=1024)
            sql = _extract_sql(reply) or sql
            result = execute_sql(sql)
            if result.get("error"):
                return f"I had trouble querying the database: {result['error']}"

        return explain_result(question, sql, result)

    except ValueError as e:
        return str(e)
    except Exception as e:
        return f"An error occurred while processing your question: {str(e)}"