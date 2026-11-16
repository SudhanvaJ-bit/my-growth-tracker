"""Request and response shapes. Pydantic validates all incoming data here."""
from datetime import date, datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

Priority = Literal["low", "medium", "high"]
TaskStatus = Literal["completed", "partial", "pending", "missed"]


# Text is trimmed BEFORE its length is checked, so "   " is rejected as empty.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


def _check_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except Exception as exc:
        raise ValueError("Unknown timezone") from exc
    return value


def _check_password(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes long")
    return value


# ---------- Auth & users ----------

class UserCreate(BaseModel):
    name: Name
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    timezone: str = "Asia/Kolkata"

    _tz = field_validator("timezone")(_check_timezone)
    _pw = field_validator("password")(_check_password)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    timezone: str
    daily_goal_percent: int
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: Name | None = None
    timezone: str | None = None
    daily_goal_percent: int | None = Field(default=None, ge=10, le=100)

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str | None) -> str | None:
        return _check_timezone(v) if v is not None else v


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    _pw = field_validator("new_password")(_check_password)


# ---------- Tasks ----------

class TaskCreate(BaseModel):
    title: Title
    description: Description = ""
    task_date: date
    planned_hours: float = Field(gt=0, le=24)
    priority: Priority = "medium"


class TaskUpdate(BaseModel):
    """All fields optional: send only what changes."""
    title: Title | None = None
    description: Description | None = None
    task_date: date | None = None
    planned_hours: float | None = Field(default=None, gt=0, le=24)
    actual_hours: float | None = Field(default=None, ge=0, le=24)
    priority: Priority | None = None
    is_completed: bool | None = None


class RescheduleRequest(BaseModel):
    new_date: date


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    task_date: date
    planned_hours: float
    actual_hours: float
    priority: Priority
    is_completed: bool
    completed_at: datetime | None
    rescheduled_to: date | None
    status: TaskStatus


# ---------- Progress ----------

class DaySummary(BaseModel):
    date: date
    planned_hours: float
    actual_hours: float
    score: float  # daily productivity percentage, 0-100
    total: int
    completed: int
    partial: int
    pending: int
    missed: int
    goal_met: bool


class Message(BaseModel):
    tone: Literal["celebrate", "encourage", "restart", "plan", "tip"]
    text: str


class DashboardOut(BaseModel):
    today: date
    summary: DaySummary
    tasks: list[TaskOut]
    streak: int
    best_streak: int
    daily_goal_percent: int
    message: Message
    carry_over: list[TaskOut]  # unfinished tasks from the last 7 days


class HistoryDay(BaseModel):
    summary: DaySummary
    tasks: list[TaskOut]


class StatsSummary(BaseModel):
    days_tracked: int
    average_score: float | None
    change: float | None  # last point minus first point, in percentage points
    planned_hours: float
    actual_hours: float


class StatsOut(BaseModel):
    range: str
    start: date
    end: date
    points: list[DaySummary]
    tasks: list[TaskOut]  # only filled for the 1-day range
    summary: StatsSummary
