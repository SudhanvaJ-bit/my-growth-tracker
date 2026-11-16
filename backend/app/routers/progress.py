"""Read-only views built from tasks: dashboard, history and graph data."""
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, status

from ..deps import CurrentUser, DbSession, today_for
from ..messages import dashboard_message
from ..progress import (
    compute_streaks,
    daily_summaries,
    group_by_day,
    last_active_day,
    sort_for_display,
    summarise_day,
    task_out,
    tasks_between,
)
from ..schemas import DashboardOut, HistoryDay, StatsOut, StatsSummary

router = APIRouter(prefix="/api", tags=["progress"])

RANGE_DAYS = {"1d": 1, "1w": 7, "1m": 30, "6m": 182, "1y": 365}


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(user: CurrentUser, db: DbSession):
    today = today_for(user)
    goal = user.daily_goal_percent
    all_tasks = tasks_between(db, user, None, today)
    days = group_by_day(all_tasks)

    todays_tasks = sort_for_display(days.get(today, []))
    today_summary = summarise_day(today, todays_tasks, today, goal)
    summaries = daily_summaries(all_tasks, today, goal)
    streaks = compute_streaks(summaries, today)

    yesterday = today - timedelta(days=1)
    missed_yesterday = sum(
        1 for t in days.get(yesterday, [])
        if not t.is_completed and t.actual_hours == 0 and t.rescheduled_to is None
    )

    # Unfinished tasks from the last week that haven't been given a new date yet.
    week_ago = today - timedelta(days=7)
    carry_over = [
        t for t in all_tasks
        if week_ago <= t.task_date < today and not t.is_completed and t.rescheduled_to is None
    ]
    carry_over.sort(key=lambda t: t.task_date, reverse=True)

    message = dashboard_message(
        today=today,
        today_summary=today_summary,
        last_active=last_active_day(all_tasks, today),
        has_history=any(d < today for d in days),
        missed_yesterday=missed_yesterday,
    )

    return DashboardOut(
        today=today,
        summary=today_summary,
        tasks=[task_out(t, today) for t in todays_tasks],
        streak=streaks.current,
        best_streak=streaks.best,
        daily_goal_percent=goal,
        message=message,
        carry_over=[task_out(t, today) for t in carry_over[:10]],
    )


@router.get("/history", response_model=list[HistoryDay])
def history(user: CurrentUser, db: DbSession, start: date | None = None, end: date | None = None):
    """Day-by-day record, newest first. Defaults to the last 30 days."""
    today = today_for(user)
    end = min(end or today, today)
    start = start or end - timedelta(days=29)
    if start > end:
        raise HTTPException(422, "start must be on or before end.")
    if (end - start).days > 366:
        raise HTTPException(422, "Ask for at most one year at a time.")

    days = group_by_day(tasks_between(db, user, start, end))
    result = []
    for day in sorted(days, reverse=True):
        tasks = sort_for_display(days[day])
        result.append(
            HistoryDay(
                summary=summarise_day(day, tasks, today, user.daily_goal_percent),
                tasks=[task_out(t, today) for t in tasks],
            )
        )
    return result


@router.get("/stats", response_model=StatsOut)
def stats(
    user: CurrentUser,
    db: DbSession,
    range: Literal["1d", "1w", "1m", "6m", "1y", "all"] = "1m",
):
    """Data for the productivity graph: one point per day that has tasks."""
    today = today_for(user)
    start = None if range == "all" else today - timedelta(days=RANGE_DAYS[range] - 1)
    tasks = tasks_between(db, user, start, today)
    points = daily_summaries(tasks, today, user.daily_goal_percent)

    scores = [p.score for p in points]
    summary = StatsSummary(
        days_tracked=len(points),
        average_score=round(sum(scores) / len(scores), 1) if scores else None,
        change=round(scores[-1] - scores[0], 1) if len(scores) >= 2 else None,
        planned_hours=round(sum(p.planned_hours for p in points), 2),
        actual_hours=round(sum(p.actual_hours for p in points), 2),
    )
    return StatsOut(
        range=range,
        start=start or (points[0].date if points else today),
        end=today,
        points=points,
        tasks=[task_out(t, today) for t in sort_for_display(tasks)] if range == "1d" else [],
        summary=summary,
    )
