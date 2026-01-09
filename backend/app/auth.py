import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

pwd = CryptContext(schemes=["argon2"], deprecated="auto")

ALGO = "HS256"
COOKIE_NAME = "access_token"
ACCESS_TOKEN_DAYS = 14

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd.verify(p, h)

def _secret() -> str:
    return os.getenv("JWT_SECRET", "dev-secret-change-me")

def create_access_token(*, user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, _secret(), algorithm=ALGO)

def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALGO])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


