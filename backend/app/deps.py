"""Shared FastAPI dependencies."""
from datetime import date, datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """Every protected endpoint depends on this. No valid token, no access."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please log in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def today_for(user: User) -> date:
    """Today's date in the user's own timezone (the server itself runs in UTC)."""
    try:
        tz = ZoneInfo(user.timezone)
    except Exception:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()
