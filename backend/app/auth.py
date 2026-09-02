"""Local authentication primitives shared by API routers."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta

from fastapi import Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.db import database, utc_now


SESSION_DURATION = timedelta(hours=8)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)


def hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()


def create_session(user: sqlite3.Row) -> AuthResponse:
    token = secrets.token_urlsafe(48)
    expires_at = utc_now() + SESSION_DURATION
    with database() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (hash_token(token), user["id"], expires_at.isoformat(), utc_now().isoformat()),
        )
    return AuthResponse(token=token, user=UserResponse(id=user["id"], name=user["name"], email=user["email"]))


def current_user(authorization: str | None = Header(default=None)) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token = authorization.removeprefix("Bearer ")
    with database() as connection:
        row = connection.execute(
            """SELECT users.id, users.name, users.email, sessions.expires_at
               FROM sessions JOIN users ON users.id = sessions.user_id
               WHERE sessions.token_hash = ?""",
            (hash_token(token),),
        ).fetchone()
    if not row or datetime.fromisoformat(row["expires_at"]) <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
    return UserResponse(id=row["id"], name=row["name"], email=row["email"])


def register_user(payload: RegisterRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()
    user_id = secrets.token_urlsafe(18)
    salt = secrets.token_bytes(16)
    password_hash = hash_password(payload.password, salt)
    try:
        with database() as connection:
            connection.execute(
                "INSERT INTO users (id, name, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, payload.name.strip(), email, salt, password_hash, utc_now().isoformat()),
            )
            user = connection.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email.") from error
    return create_session(user)


def login_user(payload: LoginRequest) -> AuthResponse:
    with database() as connection:
        user = connection.execute("SELECT * FROM users WHERE email = ?", (str(payload.email).strip().lower(),)).fetchone()
    if not user or not hmac.compare_digest(hash_password(payload.password, user["password_salt"]), user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")
    return create_session(user)


def logout_token(authorization: str | None) -> None:
    if authorization and authorization.startswith("Bearer "):
        with database() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(authorization.removeprefix("Bearer ")),))
