import sqlite3
import threading
import bcrypt
from jose import jwt
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH    = Path(__file__).parent.parent / "smartpat.db"
SECRET_KEY = "smartpat-secret-key-change-in-prod"
ALGORITHM  = "HS256"
TOKEN_DAYS = 7

# ─────────────────────────────
# CONNECTION POOL
# Each thread gets its own persistent SQLite connection.
# SQLite connections must not be shared across threads, but reusing the same
# connection within a thread eliminates the open/close overhead on every call.
# ─────────────────────────────
_local = threading.local()


def _get_raw_conn() -> sqlite3.Connection:
    """Return this thread's persistent connection, creating it if needed."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        _local.conn = conn
    return conn


@contextmanager
def get_conn():
    """
    Yield the thread-local connection wrapped in a transaction.
    Commits on success, rolls back on any exception.
    The connection itself is NOT closed — it stays alive for the thread's lifetime.
    """
    conn = _get_raw_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


# ─────────────────────────────
# PASSWORD HELPERS
# ─────────────────────────────
def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ─────────────────────────────
# DB INIT
# ─────────────────────────────
def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                avatar_url      TEXT,
                created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now')),
                last_login      TEXT
            )
        """)
        # Migrate older schemas that may be missing these columns.
        # Catch only the specific "duplicate column" error, not everything.
        for col_def in ("last_login TEXT", "avatar_url TEXT"):
            col_name = col_def.split()[0]
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise


# ─────────────────────────────
# TOKEN
# ─────────────────────────────
def _make_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ─────────────────────────────
# AUTH OPERATIONS
# ─────────────────────────────
def register(name: str, email: str, password: str) -> dict:
    with get_conn() as conn:
        if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            raise ValueError("Email already registered")
        cur = conn.execute(
            """INSERT INTO users (name, email, hashed_password, last_login)
               VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%S', 'now'))""",
            (name, email, _hash(password)),
        )
        user_id = cur.lastrowid
        if user_id is None:
            raise RuntimeError("Failed to create user")
        row = conn.execute(
            "SELECT created_at, last_login FROM users WHERE id=?", (user_id,)
        ).fetchone()

    return {
        "access_token": _make_token(user_id),
        "name":         name,
        "email":        email,
        "joined_at":    row["created_at"],
        "last_login":   row["last_login"],
    }


def login(email: str, password: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, hashed_password, created_at FROM users WHERE email=?",
            (email,),
        ).fetchone()
        if not row or not _verify(password, row["hashed_password"]):
            raise ValueError("Invalid email or password")

        # Record login time — we already know the value, no need to SELECT it back
        now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        conn.execute(
            "UPDATE users SET last_login=? WHERE id=?",
            (now_iso, row["id"]),
        )

    return {
        "access_token": _make_token(row["id"]),
        "name":         row["name"],
        "email":        email,
        "joined_at":    row["created_at"],
        "last_login":   now_iso,
    }


def update_avatar(user_id: int, url: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET avatar_url=? WHERE id=?",
            (url, user_id),
        )


def get_avatar(user_id: int) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT avatar_url FROM users WHERE id=?", (user_id,)
        ).fetchone()
    return row["avatar_url"] if row else None
