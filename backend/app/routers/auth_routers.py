from fastapi import APIRouter, Response, Depends, HTTPException

from sqlalchemy.orm import Session
from sqlalchemy import select

from ..models import User
from ..schemas import SignupIn, LoginIn, UserOut
from ..auth import COOKIE_NAME, create_access_token, hash_password, verify_password, require_user
from ..db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserOut)
def signup(payload: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    u = User(email=email, password_hash=hash_password(payload.password))
    db.add(u)
    db.commit()
    db.refresh(u)

    token = create_access_token(user_id=u.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # set True in production over HTTPS
        path="/",
        max_age=60 * 60 * 24 * 14,
    )
    return UserOut(id=u.id, email=u.email)

@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    u = db.scalar(select(User).where(User.email == email))
    if not u or not verify_password(payload.password, u.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = create_access_token(user_id=u.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
        max_age=60 * 60 * 24 * 14,
    )
    return UserOut(id=u.id, email=u.email)

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(require_user)):
    return UserOut(id=user.id, email=user.email)
