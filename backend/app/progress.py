"""All the productivity maths lives here, in one place.

Daily productivity percentage
-----------------------------
For each task on a day we work out "credited hours":
  * completed task      -> its full planned hours (finishing early still counts in full)
  * not completed       -> the hours actually spent, capped at the planned hours
Score = credited hours / planned hours x 100.

Task status
-----------
  completed  marked done
  partial    some hours logged but not marked done
  pending    nothing logged yet, and the day is today or in the future
  missed     nothing logged, and the day has passed
"""
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Task, User
from .schemas import DaySummary, TaskOut


def task_status(task: Task, today: date) -> str:
    if task.is_completed:
        return "completed"
    if task.actual_hours > 0:
        return "partial"
    return "missed" if task.task_date < today else "pending"


def task_out(task: Task, today: date) -> TaskOut:
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        task_date=task.task_date,
        planned_hours=task.planned_hours,
        actual_hours=task.actual_hours,
        priority=task.priority,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        rescheduled_to=task.rescheduled_to,
        status=task_status(task, today),
    )


def credited_hours(task: Task) -> float:
    if task.is_completed:
        return task.planned_hours
    return min(task.actual_hours, task.planned_hours)


def summarise_day(day: date, tasks: list[Task], today: date, goal: int) -> DaySummary:
    planned = sum(t.planned_hours for t in tasks)
    actual = sum(t.actual_hours for t in tasks)
    credited = sum(credited_hours(t) for t in tasks)
    score = round(credited / planned * 100, 1) if planned > 0 else 0.0
    counts = {"completed": 0, "partial": 0, "pending": 0, "missed": 0}
    for t in tasks:
        counts[task_status(t, today)] += 1
    return DaySummary(
        date=day,
        planned_hours=round(planned, 2),
        actual_hours=round(actual, 2),
        score=score,
        total=len(tasks),
        goal_met=bool(tasks) and score >= goal,
        **counts,
    )


def tasks_between(db: Session, user: User, start: date | None, end: date | None) -> list[Task]:
    """Tasks for ONE user in a date range. Every query in the app is scoped by user_id."""
    query = select(Task).where(Task.user_id == user.id)
    if start is not None:
        query = query.where(Task.task_date >= start)
    if end is not None:
        query = query.where(Task.task_date <= end)
    query = query.order_by(Task.task_date, Task.is_completed, Task.id)
    return list(db.scalars(query))


PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def sort_for_display(tasks: list[Task]) -> list[Task]:
    """Open tasks first, then by priority."""
    return sorted(tasks, key=lambda t: (t.is_completed, PRIORITY_ORDER.get(t.priority, 1), t.id))


def group_by_day(tasks: list[Task]) -> dict[date, list[Task]]:
    days: dict[date, list[Task]] = {}
    for t in tasks:
        days.setdefault(t.task_date, []).append(t)
    return days


def daily_summaries(tasks: list[Task], today: date, goal: int) -> list[DaySummary]:
    """One summary per day that has tasks, oldest first."""
    days = group_by_day(tasks)
    return [summarise_day(d, days[d], today, goal) for d in sorted(days)]


@dataclass
class Streaks:
    current: int
    best: int


def compute_streaks(summaries: list[DaySummary], today: date) -> Streaks:
    """Consecutive calendar days that met the daily goal.

    Today only ever adds to the streak: an unfinished today does not break it,
    because the day is still in progress.
    """
    met = {s.date for s in summaries if s.goal_met and s.date <= today}

    current = 0
    day = today if today in met else today - timedelta(days=1)
    while day in met:
        current += 1
        day -= timedelta(days=1)

    best = run = 0
    previous: date | None = None
    for day in sorted(met):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return Streaks(current=current, best=best)


def last_active_day(tasks: list[Task], today: date) -> date | None:
    """Most recent day (up to today) on which any work was recorded."""
    active = [t.task_date for t in tasks if t.task_date <= today and (t.is_completed or t.actual_hours > 0)]
    return max(active) if active else None
