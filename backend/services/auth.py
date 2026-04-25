import psycopg2
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

DATABASE_URL = "postgresql://neondb_owner:npg_cGd5utiCsv6K@ep-patient-unit-aoepu54a-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SECRET_KEY   = "smartpat-secret-key-change-in-prod"
ALGORITHM    = "HS256"
TOKEN_DAYS   = 7

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
        conn.commit()


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
                "INSERT INTO users (name, email, hashed_password) VALUES (%s, %s, %s) RETURNING id",
                (name, email, pwd_ctx.hash(password))
            )
            user_id = cur.fetchone()[0]
        conn.commit()
    return {"access_token": _make_token(user_id), "name": name, "email": email}


def login(email: str, password: str) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, hashed_password FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row or not pwd_ctx.verify(password, row[2]):
        raise ValueError("Invalid email or password")
    return {"access_token": _make_token(row[0]), "name": row[1], "email": email}
