import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import TaskItem from "../components/TaskItem";
import { ErrorNote, PageHeader } from "../components/ui";
import useTaskDialogs from "../components/useTaskDialogs";
import { api } from "../lib/api";
import { addDays, formatHours, formatLong, relativeDay, todayISO } from "../lib/dates";

export default function Tasks() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get(`/api/tasks?date=${date}`)
      .then((t) => (setTasks(t), setError("")))
      .catch((e) => setError(e.message));
  }, [date]);

  useEffect(() => {
    setTasks(null);
    load();
  }, [load]);

  const { dialogs, openAdd, openEdit, openReschedule } = useTaskDialogs({ defaultDate: date, onSaved: load });

  const planned = (tasks ?? []).reduce((sum, t) => sum + t.planned_hours, 0);
  const actual = (tasks ?? []).reduce((sum, t) => sum + t.actual_hours, 0);
  const heading = relativeDay(date, today);

  return (
    <>
      <PageHeader title="Tasks" subtitle="Plan any day, then log what you actually did.">
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add task</button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button className="icon-btn border border-line bg-surface" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft size={18} /></button>
          <input type="date" className="field w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Choose a date" />
          <button className="icon-btn border border-line bg-surface" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><ChevronRight size={18} /></button>
        </div>
        {date !== today && <button className="btn-quiet" onClick={() => setDate(today)}>Today</button>}
      </div>

      <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{heading === formatLong(date) ? heading : `${heading}, ${formatLong(date)}`}</h2>
          {tasks?.length > 0 && (
            <span className="num text-xs text-muted">{formatHours(actual)} done of {formatHours(planned)} planned</span>
          )}
        </div>
        {tasks === null ? (
          <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted">No tasks on this day.</p>
            <button className="btn-quiet mt-3" onClick={openAdd}><Plus size={16} /> Add task</button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} onChanged={load} onEdit={openEdit} onReschedule={openReschedule} onError={setError} />
            ))}
          </ul>
        )}
      </section>
      {dialogs}
    </>
  );
}
