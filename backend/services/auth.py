import os
import bcrypt
import pymysql
from jose import jwt
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

SECRET_KEY = "smartpat-secret-key-change-in-prod"
ALGORITHM  = "HS256"
TOKEN_DAYS = 7
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "smartpat")


class Row(dict):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class CursorAdapter:
    def __init__(self, cursor):
        self.cursor = cursor

    @property
    def lastrowid(self):
        return self.cursor.lastrowid

    def execute(self, sql: str, params=()):
        self.cursor.execute(sql.replace("?", "%s"), params)
        return self

    def executemany(self, sql: str, params):
        self.cursor.executemany(sql.replace("?", "%s"), params)
        return self

    def fetchone(self):
        row = self.cursor.fetchone()
        return Row(row) if row else None

    def fetchall(self):
        return [Row(row) for row in (self.cursor.fetchall() or [])]


class ConnAdapter:
    def __init__(self, conn):
        self.conn = conn
        self.cursor = CursorAdapter(conn.cursor())

    def execute(self, sql: str, params=()):
        return self.cursor.execute(sql, params)

    def executemany(self, sql: str, params):
        return self.cursor.executemany(sql, params)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.cursor.cursor.close()
        self.conn.close()


def ensure_database():
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        conn.close()


@contextmanager
def get_conn():
    ensure_database()
    raw = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    conn = ConnAdapter(raw)
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
                id              INT AUTO_INCREMENT PRIMARY KEY,
                name            VARCHAR(255) NOT NULL,
                email           VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                avatar_url      TEXT,
                is_active       TINYINT DEFAULT 1,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login      DATETIME NULL
            )
        """)


def _make_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def register(name: str, email: str, password: str) -> dict:
    with get_conn() as conn:
        if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            raise ValueError("Email already registered")
        cur = conn.execute(
            "INSERT INTO users (name, email, hashed_password, last_login) VALUES (?, ?, ?, NOW())",
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
        "avatar_url":   None,
    }


def login(email: str, password: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, hashed_password, created_at, avatar_url, is_active FROM users WHERE email=?",
            (email,),
        ).fetchone()
        if not row or not _verify(password, row["hashed_password"]):
            raise ValueError("Invalid email or password")
        if row["is_active"] == 0:
            raise ValueError("Account is deactivated")

        now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
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
        "avatar_url":   row["avatar_url"],
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


def update_profile(user_id: int, first_name: str, last_name: str, email: str) -> dict:
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email=? AND id!=?", (email, user_id)
        ).fetchone()
        if existing:
            raise ValueError("Email already in use")
        name = f"{first_name} {last_name}".strip()
        conn.execute(
            "UPDATE users SET name=?, email=? WHERE id=?",
            (name, email, user_id),
        )
        row = conn.execute(
            "SELECT name, email FROM users WHERE id=?", (user_id,)
        ).fetchone()
    return {
        "firstName": first_name,
        "lastName":  last_name,
        "email":     row["email"],
    }


def change_email(user_id: int, new_email: str, password: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT hashed_password FROM users WHERE id=?", (user_id,)
        ).fetchone()
        if not row:
            raise ValueError("User not found")
        if not _verify(password, row["hashed_password"]):
            raise ValueError("Incorrect password")
        existing = conn.execute(
            "SELECT id FROM users WHERE email=? AND id!=?", (new_email, user_id)
        ).fetchone()
        if existing:
            raise ValueError("Email already in use")
        conn.execute(
            "UPDATE users SET email=? WHERE id=?", (new_email, user_id)
        )
    return {"email": new_email}


def change_password(user_id: int, current_password: str, new_password: str) -> None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT hashed_password FROM users WHERE id=?", (user_id,)
        ).fetchone()
        if not row:
            raise ValueError("User not found")
        if not _verify(current_password, row["hashed_password"]):
            raise ValueError("Incorrect current password")
        conn.execute(
            "UPDATE users SET hashed_password=? WHERE id=?",
            (_hash(new_password), user_id)
        )


def deactivate_account(user_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET is_active=0 WHERE id=?", (user_id,)
        )


def delete_account(user_id: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
