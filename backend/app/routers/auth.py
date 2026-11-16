"""Registration, login, and the user's own account settings."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..deps import CurrentUser, DbSession
from ..models import User
from ..schemas import LoginRequest, PasswordChange, TokenOut, UserCreate, UserOut, UserUpdate
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/auth/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: DbSession):
    email = data.email.lower()
    user = User(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        timezone=data.timezone,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    return _token_response(user)


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginRequest, db: DbSession):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    # Same error for "no such user" and "wrong password", so emails can't be probed.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return _token_response(user)


@router.get("/users/me", response_model=UserOut)
def read_me(user: CurrentUser):
    return user


@router.patch("/users/me", response_model=UserOut)
def update_me(data: UserUpdate, user: CurrentUser, db: DbSession):
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    db.commit()
    return user


@router.post("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, user: CurrentUser, db: DbSession):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")
    user.password_hash = hash_password(data.new_password)
    db.commit()
