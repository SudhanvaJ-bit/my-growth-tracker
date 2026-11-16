import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import GrowthChart from "../components/GrowthChart";
import TaskItem from "../components/TaskItem";
import { ErrorNote, PageHeader, ProgressBar } from "../components/ui";
import useTaskDialogs from "../components/useTaskDialogs";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDay, formatHours, toISO, todayISO } from "../lib/dates";

const monthBounds = (year, month) => ({
  start: toISO(new Date(year, month, 1)),
  end: toISO(new Date(year, month + 1, 0)),
});

function DayRow({ day, open, onToggle, goal, taskProps }) {
  const s = day.summary;
  const parts = [
    s.completed && `${s.completed} completed`,
    s.partial && `${s.partial} partly done`,
    s.pending && `${s.pending} pending`,
    s.missed && `${s.missed} missed`,
  ].filter(Boolean);

  return (
    <li>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-sunken/60">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm font-semibold">{formatDay(s.date)}</span>
            <span className="num text-sm font-bold">{s.score}%</span>
          </div>
          <ProgressBar value={s.score} goal={goal} className="mt-2" />
          <p className="num mt-2 text-xs text-muted">
            {formatHours(s.actual_hours)} of {formatHours(s.planned_hours)} planned. {parts.join(", ")}.
          </p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-muted ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line bg-sunken/40">
          {day.tasks.map((t) => <TaskItem key={t.id} task={t} {...taskProps} />)}
        </ul>
      )}
    </li>
  );
}

export default function History() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [days, setDays] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth();
  const shift = (n) => {
    const d = new Date(month.year, month.month + n, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const load = useCallback(() => {
    const { start, end } = monthBounds(month.year, month.month);
    api
      .get(`/api/history?start=${start}&end=${end}`)
      .then((d) => (setDays(d), setError("")))
      .catch((e) => setError(e.message));
    setVersion((v) => v + 1);
  }, [month]);

  useEffect(() => {
    setDays(null);
    load();
  }, [load]);

  const { dialogs, openEdit, openReschedule } = useTaskDialogs({ defaultDate: todayISO(), onSaved: load });
  const taskProps = { onChanged: load, onEdit: openEdit, onReschedule: openReschedule, onError: setError };

  const monthName = new Date(month.year, month.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const average = days?.length ? Math.round(days.reduce((sum, d) => sum + d.summary.score, 0) / days.length) : null;

  return (
    <>
      <PageHeader title="Progress History" subtitle="Every day you've planned stays here, exactly as it happened." />
      <div className="space-y-5">
        <GrowthChart refreshKey={version} goal={user.daily_goal_percent} />
        <ErrorNote>{error}</ErrorNote>

        <section className="card" aria-label="Daily records">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-1">
              <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <h2 className="min-w-[9.5rem] text-center text-sm font-semibold">{monthName}</h2>
              <button className="icon-btn disabled:opacity-30" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
            {average != null && (
              <span className="num text-xs text-muted">{days.length} day{days.length === 1 ? "" : "s"} tracked, average {average}%</span>
            )}
          </div>
          {days === null ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
          ) : days.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">No tasks were planned in {monthName}.</p>
          ) : (
            <ul className="divide-y divide-line">
              {days.map((d) => (
                <DayRow
                  key={d.summary.date}
                  day={d}
                  goal={user.daily_goal_percent}
                  open={openDay === d.summary.date}
                  onToggle={() => setOpenDay(openDay === d.summary.date ? null : d.summary.date)}
                  taskProps={taskProps}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      {dialogs}
    </>
  );
}
