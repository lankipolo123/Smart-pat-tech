"""routers/auth.py — /auth/* routes"""

import shutil
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile
from pydantic import BaseModel

from services.auth import (
    get_conn, login, register, update_avatar, update_profile,
    change_email, change_password, deactivate_account, delete_account,
)
from services.token import get_user_id_from_token

router = APIRouter(prefix="/auth")

AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    firstName: str
    lastName: str
    email: str


class ChangeEmailRequest(BaseModel):
    newEmail: str
    password: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


@router.post("/login")
def auth_login(req: LoginRequest):
    try:
        return login(req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/register")
def auth_register(req: RegisterRequest):
    try:
        return register(req.name, req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/profile")
def auth_update_profile(
    req: UpdateProfileRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id_from_token(authorization)
    try:
        return update_profile(user_id, req.firstName, req.lastName, req.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/avatar")
async def auth_upload_avatar(
    request: Request,
    file: UploadFile = File(...),
):
    authorization = request.headers.get("authorization")
    user_id = get_user_id_from_token(authorization)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    filename = f"user_{user_id}{ext}"
    dest = AVATAR_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    url = f"http://localhost:8000/uploads/avatars/{filename}"
    update_avatar(user_id, url)
    return {"photoURL": url}


@router.patch("/email")
def auth_change_email(
    req: ChangeEmailRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id_from_token(authorization)
    try:
        return change_email(user_id, req.newEmail, req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/password")
def auth_change_password(
    req: ChangePasswordRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id_from_token(authorization)
    try:
        change_password(user_id, req.currentPassword, req.newPassword)
        return {"message": "Password updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deactivate")
def auth_deactivate(
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id_from_token(authorization)
    try:
        deactivate_account(user_id)
        return {"message": "Account deactivated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/account")
def auth_delete_account(
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id_from_token(authorization)
    try:
        delete_account(user_id)
        return {"message": "Account deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))