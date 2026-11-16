"""Database tables.

There are only two: users and tasks. Every task belongs to one user and one
calendar date, so the "daily record" for any day is simply that day's tasks.
Nothing is reset at midnight, which is why history is never lost.
"""
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    # Used to decide what "today" means for this user.
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    # A day counts towards the streak when its productivity reaches this %.
    daily_goal_percent: Mapped[int] = mapped_column(Integer, default=70)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("daily_goal_percent BETWEEN 10 AND 100", name="ck_users_goal_range"),
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    task_date: Mapped[date] = mapped_column(Date)
    planned_hours: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False))
    actual_hours: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), default=0)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Set when the unfinished part of this task was copied to another day.
    rescheduled_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="tasks")

    __table_args__ = (
        CheckConstraint("planned_hours > 0 AND planned_hours <= 24", name="ck_tasks_planned_range"),
        CheckConstraint("actual_hours >= 0 AND actual_hours <= 24", name="ck_tasks_actual_range"),
        CheckConstraint("priority IN ('low', 'medium', 'high')", name="ck_tasks_priority"),
        Index("ix_tasks_user_date", "user_id", "task_date"),
    )
