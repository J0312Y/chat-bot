import sqlite3
import os

from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "chatbot.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'Nouvelle conversation',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );
    """)
    conn.commit()
    conn.close()


# --- Users ---

def create_user(username, password):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, generate_password_hash(password)),
        )
        conn.commit()
        user_id = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()["id"]
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None


def authenticate_user(username, password):
    conn = get_db()
    row = conn.execute(
        "SELECT id, password_hash FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    if row and check_password_hash(row["password_hash"], password):
        return row["id"]
    return None


def get_user(user_id):
    conn = get_db()
    row = conn.execute(
        "SELECT id, username FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "username": row["username"]}
    return None


# --- Conversations ---

def create_conversation(conversation_id, user_id):
    conn = get_db()
    conn.execute(
        "INSERT INTO conversations (id, user_id) VALUES (?, ?)",
        (conversation_id, user_id),
    )
    conn.commit()
    conn.close()


def get_user_conversations(user_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, title, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [{"id": row["id"], "title": row["title"], "created_at": row["created_at"]} for row in rows]


def conversation_belongs_to_user(conversation_id, user_id):
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user_id),
    ).fetchone()
    conn.close()
    return row is not None


def conversation_exists(conversation_id):
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM conversations WHERE id = ?", (conversation_id,)
    ).fetchone()
    conn.close()
    return row is not None


# --- Messages ---

def save_message(conversation_id, role, content):
    conn = get_db()
    conn.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, role, content),
    )
    conn.commit()
    conn.close()


def get_messages(conversation_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id",
        (conversation_id,),
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows]
