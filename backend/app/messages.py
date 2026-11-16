"""Short, friendly messages for the dashboard.

Rules: practical, never guilt-tripping, no dramatic quotes. The message is
picked by situation first, then rotated by date so it changes from day to day
but stays stable within a day.
"""
from datetime import date

from .schemas import DaySummary, Message

ALL_DONE = [
    "Everything planned for today is done. Nice work.",
    "All of today's tasks are complete. Enjoy the rest of your day.",
    "Clean sweep today. That's how streaks get built.",
    "Today's plan: finished. Tomorrow's plan can wait until tomorrow.",
]

RESTART = [
    "It's been {days} days. No catching up needed, just pick one small task for today.",
    "Welcome back. A {days}-day gap doesn't undo your earlier work. Start with something short.",
    "Fresh start. Plan one hour today and take it from there.",
]

MISSED_YESTERDAY = [
    "Yesterday didn't go to plan, and that's fine. You can move what's left to another day.",
    "Some of yesterday's tasks are still open. Reschedule the ones that still matter and drop the rest.",
    "Plans slip sometimes. Pick the most important leftover task and give it a new date.",
]

NOTHING_PLANNED = [
    "Nothing planned for today yet. Add one or two tasks to get going.",
    "A blank day. What's the one thing worth doing today?",
    "No tasks yet today. Even a 30-minute task counts.",
]

IN_PROGRESS = [
    "Good progress. {left} to go today.",
    "You're partway through today's plan. {left} left.",
    "Keep the momentum: {left} still open today.",
]

DAILY_TIPS = [
    "Start with the task you're most likely to put off.",
    "Planning fewer hours and finishing them beats planning many and finishing half.",
    "Log your hours right after a task, while you still remember them.",
    "A short session still counts. Twenty minutes is better than zero.",
    "If a task feels too big, split it into two smaller ones.",
    "High priority first, while your energy is fresh.",
    "Leave some slack in the day. Things take longer than planned.",
    "Consistency matters more than any single big day.",
    "Finished early? Log the real hours anyway, it makes future planning more accurate.",
    "One task at a time. The list will still be there.",
]


def _pick(options: list[str], today: date) -> str:
    return options[today.toordinal() % len(options)]


def dashboard_message(
    today: date,
    today_summary: DaySummary,
    last_active: date | None,
    has_history: bool,
    missed_yesterday: int,
) -> Message:
    # 1. Everything done today.
    if today_summary.total > 0 and today_summary.completed == today_summary.total:
        return Message(tone="celebrate", text=_pick(ALL_DONE, today))

    worked_today = today_summary.completed > 0 or today_summary.partial > 0

    # 2. Away for a while: encourage a restart.
    if has_history and not worked_today:
        gap = (today - last_active).days if last_active else None
        if gap is not None and gap >= 3:
            return Message(tone="restart", text=_pick(RESTART, today).format(days=gap))

    # 3. Already making progress today.
    if worked_today:
        open_count = today_summary.total - today_summary.completed
        left = f"{open_count} task{'s' if open_count != 1 else ''}"
        return Message(tone="encourage", text=_pick(IN_PROGRESS, today).format(left=left))

    # 4. Yesterday had tasks that were not touched.
    if missed_yesterday > 0:
        return Message(tone="encourage", text=_pick(MISSED_YESTERDAY, today))

    # 5. Nothing planned yet.
    if today_summary.total == 0:
        return Message(tone="plan", text=_pick(NOTHING_PLANNED, today))

    # 6. Ordinary day: a small practical tip.
    return Message(tone="tip", text=_pick(DAILY_TIPS, today))
