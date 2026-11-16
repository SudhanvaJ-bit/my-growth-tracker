import { useState } from "react";
import { api } from "../lib/api";
import Modal from "./Modal";
import { ErrorNote } from "./ui";

// Used for both "Add task" and "Edit task" (when a task is passed in).
export default function TaskForm({ task, defaultDate, onClose, onSaved }) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    task_date: task?.task_date ?? defaultDate,
    planned_hours: task?.planned_hours ?? 1,
    actual_hours: task?.actual_hours ?? 0,
    priority: task?.priority ?? "medium",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    const planned = Number(form.planned_hours);
    const actual = Number(form.actual_hours);
    if (!form.title.trim()) return setError("Give the task a name.");
    if (!(planned > 0 && planned <= 24)) return setError("Planned hours must be between 0.25 and 24.");
    if (editing && !(actual >= 0 && actual <= 24)) return setError("Hours spent must be between 0 and 24.");

    const body = {
      title: form.title,
      description: form.description,
      task_date: form.task_date,
      planned_hours: planned,
      priority: form.priority,
    };
    setSaving(true);
    try {
      if (editing) await api.patch(`/api/tasks/${task.id}`, { ...body, actual_hours: actual });
      else await api.post("/api/tasks", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit task" : "Add task"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="t-title">Task name</label>
          <input id="t-title" className="field" value={form.title} onChange={set("title")} maxLength={120} autoFocus placeholder="e.g. Revise graph algorithms" />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Description <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="t-desc" className="field min-h-[72px]" value={form.description} onChange={set("description")} maxLength={2000} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-date">Date</label>
            <input id="t-date" type="date" className="field" value={form.task_date} onChange={set("task_date")} required />
          </div>
          <div>
            <label className="label" htmlFor="t-priority">Priority</label>
            <select id="t-priority" className="field" value={form.priority} onChange={set("priority")}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-planned">Planned hours</label>
            <input id="t-planned" type="number" className="field num" min="0.25" max="24" step="0.25" value={form.planned_hours} onChange={set("planned_hours")} />
          </div>
          {editing && (
            <div>
              <label className="label" htmlFor="t-actual">Hours spent</label>
              <input id="t-actual" type="number" className="field num" min="0" max="24" step="0.25" value={form.actual_hours} onChange={set("actual_hours")} />
            </div>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
