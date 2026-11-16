import { useState } from "react";
import { api } from "../lib/api";
import { addDays, formatDay, todayISO } from "../lib/dates";
import Modal from "./Modal";
import { ErrorNote } from "./ui";

export default function RescheduleDialog({ task, onClose, onSaved }) {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const isPast = task.task_date < today;
  const [date, setDate] = useState(isPast ? today : tomorrow);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const keepsOriginal = isPast || task.actual_hours > 0;
  const remaining = Math.max(task.planned_hours - task.actual_hours, 0.25);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/tasks/${task.id}/reschedule`, { new_date: date });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const quick = [
    isPast && { label: "Today", value: today },
    { label: "Tomorrow", value: tomorrow },
    { label: "In 2 days", value: addDays(today, 2) },
    { label: "Next week", value: addDays(today, 7) },
  ].filter(Boolean);

  return (
    <Modal title="Reschedule task" onClose={onClose}>
      <p className="text-sm font-medium">{task.title}</p>
      <p className="mt-1 text-sm text-muted">
        {keepsOriginal
          ? `The remaining ${remaining}h will be added to the new day. ${formatDay(task.task_date)} stays in your history as it was.`
          : "This task will move to the day you pick."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => setDate(q.value)}
            aria-pressed={date === q.value}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              date === q.value ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:bg-sunken"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label className="label" htmlFor="r-date">Or pick a date</label>
        <input id="r-date" type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-quiet" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving || !date}>
          {saving ? "Saving…" : "Reschedule"}
        </button>
      </div>
    </Modal>
  );
}
