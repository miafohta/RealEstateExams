# app/routers/me.py
from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from typing import Annotated
from sqlalchemy.orm import Session

from app.auth import COOKIE_NAME, decode_token
from app.db import get_db
from app.models import User

router = APIRouter(tags=["me"])

def get_current_user(
    access_token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
    db: Session = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = decode_token(access_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.get(User, user_id)  # SQLAlchemy 2.0 style
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at,
    }
