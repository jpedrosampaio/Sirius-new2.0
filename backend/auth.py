from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, Cookie

from core.database import get_database
from models.user import User


async def get_current_user(
    authorization: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
) -> User:
    token = session_token or (
        authorization.replace("Bearer ", "") if authorization else None
    )
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db = get_database()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    for field in ["name", "xp", "rank", "picture", "birth_date", "bio"]:
        user_doc.setdefault(
            field,
            "Usuário" if field == "name" else ("Recruta" if field == "rank" else (0 if field == "xp" else None)),
        )

    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])

    return User(**user_doc)
