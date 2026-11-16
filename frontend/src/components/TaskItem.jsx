import { CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDay, formatHours } from "../lib/dates";
import { PriorityTag, StatusBadge } from "./ui";

// One task row: tick to complete, type hours spent, edit / reschedule / delete.
export default function TaskItem({ task, onChanged, onEdit, onReschedule, onError, showDate = false }) {
  const [hours, setHours] = useState(String(task.actual_hours));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setHours(String(task.actual_hours)), [task.actual_hours]);

  async function run(action) {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleDone = () => run(() => api.patch(`/api/tasks/${task.id}`, { is_completed: !task.is_completed }));

  function saveHours() {
    const value = Number(hours);
    if (hours === "" || Number.isNaN(value) || value < 0 || value > 24) {
      setHours(String(task.actual_hours));
      onError?.("Hours spent must be between 0 and 24.");
      return;
    }
    if (value === task.actual_hours) return;
    run(() => api.patch(`/api/tasks/${task.id}`, { actual_hours: value }));
  }

  const canReschedule = !task.is_completed && !task.rescheduled_to;

  return (
    <li className="flex gap-3 px-4 py-3.5">
      <button
        onClick={toggleDone}
        disabled={busy}
        aria-pressed={task.is_completed}
        aria-label={task.is_completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
          task.is_completed ? "border-good bg-good text-surface" : "border-line hover:border-accent"
        }`}
      >
        {task.is_completed && <Check size={15} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className={`text-[15px] font-medium ${task.is_completed ? "text-muted line-through" : ""}`}>{task.title}</span>
          <StatusBadge status={task.status} />
        </div>
        {task.description && <p className="mt-0.5 whitespace-pre-line break-words text-sm text-muted">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          {showDate && <span>{formatDay(task.task_date)}</span>}
          <PriorityTag priority={task.priority} />
          <span className="num">{formatHours(task.planned_hours)} planned</span>
          <label className="flex items-center gap-1.5">
            <span>Spent</span>
            <input
              type="number"
              min="0"
              max="24"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onBlur={saveHours}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              disabled={busy}
              aria-label={`Hours spent on ${task.title}`}
              className="num w-16 rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            />
            <span>h</span>
          </label>
          {task.rescheduled_to && <span>Rest moved to {formatDay(task.rescheduled_to)}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-0.5">
        {confirmDelete ? (
          <>
            <button className="rounded-lg px-2 py-1.5 text-xs font-semibold text-soft hover:bg-soft/10" disabled={busy} onClick={() => run(() => api.del(`/api/tasks/${task.id}`))}>
              Delete
            </button>
            <button className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-sunken" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </>
        ) : (
          <>
            {canReschedule && (
              <button className="icon-btn" onClick={() => onReschedule(task)} aria-label={`Reschedule ${task.title}`} title="Reschedule">
                <CalendarClock size={16} />
              </button>
            )}
            <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit">
              <Pencil size={16} />
            </button>
            <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${task.title}`} title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
