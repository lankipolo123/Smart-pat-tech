import sqlite3
import bcrypt
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from jose import jwt

DB_PATH    = Path(__file__).parent.parent / "smartpat.db"
SECRET_KEY = "smartpat-secret-key-change-in-prod"
ALGORITHM  = "HS256"
TOKEN_DAYS = 7


@contextmanager
def get_conn():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now')),
                last_login      TEXT
            )
        """)
        try:
            conn.execute("ALTER TABLE users ADD COLUMN last_login TEXT")
        except Exception:
            pass


def _make_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS)},
        SECRET_KEY, algorithm=ALGORITHM
    )


def register(name: str, email: str, password: str) -> dict:
    with get_conn() as conn:
        if conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
            raise ValueError("Email already registered")
        cur = conn.execute(
            """INSERT INTO users (name, email, hashed_password, last_login)
               VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now'))""",
            (name, email, _hash(password))
        )
        user_id = cur.lastrowid
        row = conn.execute(
            "SELECT created_at, last_login FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return {
        "access_token": _make_token(user_id),
        "name": name,
        "email": email,
        "joined_at": row["created_at"],
        "last_login": row["last_login"],
    }


def login(email: str, password: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, hashed_password, created_at FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        if not row or not _verify(password, row["hashed_password"]):
            raise ValueError("Invalid email or password")
        conn.execute(
            "UPDATE users SET last_login = strftime('%Y-%m-%dT%H:%M:%S', 'now') WHERE id = ?",
            (row["id"],)
        )
        last_login = conn.execute(
            "SELECT last_login FROM users WHERE id = ?", (row["id"],)
        ).fetchone()["last_login"]
    return {
        "access_token": _make_token(row["id"]),
        "name": row["name"],
        "email": email,
        "joined_at": row["created_at"],
        "last_login": last_login,
    }
