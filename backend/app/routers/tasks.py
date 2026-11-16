"""Create, read, update, delete and reschedule tasks."""
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, today_for
from ..models import Task, User, utcnow
from ..progress import sort_for_display, task_out, tasks_between
from ..schemas import RescheduleRequest, TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

MAX_DAYS_AHEAD = 366 * 2


def _get_own_task(db, user: User, task_id: int) -> Task:
    """Fetch a task only if it belongs to this user.

    Someone else's task gives the same 404 as a task that doesn't exist,
    so the API never reveals that it exists.
    """
    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found.")
    return task


def _check_date(day: date, today: date) -> None:
    if day > today + timedelta(days=MAX_DAYS_AHEAD):
        raise HTTPException(422, "That date is too far in the future.")
    if day < today - timedelta(days=MAX_DAYS_AHEAD):
        raise HTTPException(422, "That date is too far in the past.")


@router.get("", response_model=list[TaskOut])
def list_tasks(
    user: CurrentUser,
    db: DbSession,
    day: date | None = Query(default=None, alias="date", description="A single day"),
    start: date | None = None,
    end: date | None = None,
):
    today = today_for(user)
    if day is not None:
        start = end = day
    elif start is None and end is None:
        start = end = today
    if start and end and start > end:
        raise HTTPException(422, "start must be on or before end.")
    tasks = tasks_between(db, user, start, end)
    tasks = sorted(sort_for_display(tasks), key=lambda t: t.task_date)
    return [task_out(t, today) for t in tasks]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreate, user: CurrentUser, db: DbSession):
    today = today_for(user)
    _check_date(data.task_date, today)
    task = Task(user_id=user.id, **data.model_dump())
    db.add(task)
    db.commit()
    return task_out(task, today)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, data: TaskUpdate, user: CurrentUser, db: DbSession):
    today = today_for(user)
    task = _get_own_task(db, user, task_id)
    changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}

    if "task_date" in changes:
        _check_date(changes["task_date"], today)

    was_completed = task.is_completed
    for field, value in changes.items():
        setattr(task, field, value)

    if task.is_completed and not was_completed:
        task.completed_at = utcnow()
        # Marked done without logging time: assume it took the planned time.
        if "actual_hours" not in changes and task.actual_hours == 0:
            task.actual_hours = task.planned_hours
    elif not task.is_completed and was_completed:
        task.completed_at = None

    db.commit()
    return task_out(task, today)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, user: CurrentUser, db: DbSession):
    task = _get_own_task(db, user, task_id)
    db.delete(task)
    db.commit()


@router.post("/{task_id}/reschedule", response_model=TaskOut)
def reschedule_task(task_id: int, data: RescheduleRequest, user: CurrentUser, db: DbSession):
    """Move unfinished work to another day without rewriting history.

    * Untouched task that is still today/future -> simply moved to the new date.
    * Past task, or a task with hours already logged -> the original stays where
      it is (so that day's record is unchanged) and a NEW task is created on the
      new date for the remaining hours.
    Returns the task that now sits on the new date.
    """
    today = today_for(user)
    task = _get_own_task(db, user, task_id)

    if task.is_completed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This task is already completed.")
    if task.rescheduled_to is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This task has already been rescheduled.")
    if data.new_date < today:
        raise HTTPException(422, "Pick today or a future date.")
    if data.new_date == task.task_date:
        raise HTTPException(422, "The task is already on that date.")
    _check_date(data.new_date, today)

    if task.task_date >= today and task.actual_hours == 0:
        task.task_date = data.new_date
        db.commit()
        return task_out(task, today)

    remaining = round(max(task.planned_hours - task.actual_hours, 0.25), 2)
    follow_up = Task(
        user_id=user.id,
        title=task.title,
        description=task.description,
        task_date=data.new_date,
        planned_hours=remaining,
        priority=task.priority,
    )
    task.rescheduled_to = data.new_date
    db.add(follow_up)
    db.commit()
    return task_out(follow_up, today)
