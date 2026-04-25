import bcrypt
import psycopg2
from psycopg2 import pool as pg_pool
from contextlib import contextmanager
from datetime import datetime, timedelta
from jose import jwt

DATABASE_URL = "postgresql://neondb_owner:npg_cGd5utiCsv6K@ep-patient-unit-aoepu54a-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SECRET_KEY   = "smartpat-secret-key-change-in-prod"
ALGORITHM    = "HS256"
TOKEN_DAYS   = 7

_pool: pg_pool.ThreadedConnectionPool | None = None


def _get_pool() -> pg_pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = pg_pool.ThreadedConnectionPool(1, 5, DATABASE_URL)
    return _pool


@contextmanager
def get_conn():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def init_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_login TIMESTAMP
                )
            """)
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP")


def _make_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS)},
        SECRET_KEY, algorithm=ALGORITHM
    )


def register(name: str, email: str, password: str) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise ValueError("Email already registered")
            cur.execute(
                """INSERT INTO users (name, email, hashed_password, last_login)
                   VALUES (%s, %s, %s, NOW())
                   RETURNING id, created_at, last_login""",
                (name, email, _hash(password))
            )
            user_id, created_at, last_login = cur.fetchone()
    return {
        "access_token": _make_token(user_id),
        "name": name,
        "email": email,
        "joined_at": created_at.isoformat() if created_at else None,
        "last_login": last_login.isoformat() if last_login else None,
    }


def login(email: str, password: str) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, hashed_password, created_at FROM users WHERE email = %s",
                (email,)
            )
            row = cur.fetchone()
            if not row or not _verify(password, row[2]):
                raise ValueError("Invalid email or password")
            cur.execute(
                "UPDATE users SET last_login = NOW() WHERE id = %s RETURNING last_login",
                (row[0],)
            )
            last_login = cur.fetchone()[0]
    return {
        "access_token": _make_token(row[0]),
        "name": row[1],
        "email": email,
        "joined_at": row[3].isoformat() if row[3] else None,
        "last_login": last_login.isoformat() if last_login else None,
    }
