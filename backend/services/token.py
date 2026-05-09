from fastapi import HTTPException
from jose import jwt as jose_jwt, JWTError

SECRET_KEY = "smartpat-secret-key-change-in-prod"
ALGORITHM  = "HS256"


def get_user_id_from_token(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")