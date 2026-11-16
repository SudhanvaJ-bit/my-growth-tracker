import { CalendarClock, Flame, PartyPopper, Plus, RotateCcw, Sparkles, Sprout } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import GrowthChart from "../components/GrowthChart";
import TaskItem from "../components/TaskItem";
import { ErrorNote, PageHeader, ProgressBar, StatusBadge } from "../components/ui";
import useTaskDialogs from "../components/useTaskDialogs";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatHours, formatLong, relativeDay } from "../lib/dates";

const MESSAGE_ICON = { celebrate: PartyPopper, encourage: Sprout, restart: RotateCcw, plan: Plus, tip: Sparkles };

function Stat({ label, value, note }) {
  return (
    <div className="flex flex-col justify-center px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="num mt-0.5 text-xl font-bold tracking-tight">{value}</p>
      {note && <p className="num text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // bumps after every change so the graph reloads

  const load = useCallback(() => {
    api
      .get("/api/dashboard")
      .then((d) => (setData(d), setError("")))
      .catch((e) => setError(e.message));
    setVersion((v) => v + 1);
  }, []);

  useEffect(load, [load]);

  const { dialogs, openAdd, openEdit, openReschedule } = useTaskDialogs({ defaultDate: data?.today, onSaved: load });

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        {error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-muted">Loading…</p>}
      </>
    );
  }

  const s = data.summary;
  const MsgIcon = MESSAGE_ICON[data.message.tone] || Sparkles;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Hi, ${firstName}`} subtitle={formatLong(data.today)}>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add task
        </button>
      </PageHeader>

      <div className="space-y-5">
        <ErrorNote>{error}</ErrorNote>

        <div className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/[0.07] px-4 py-3">
          <MsgIcon size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm font-medium">{data.message.text}</p>
        </div>

        {/* Today's numbers */}
        <section className="card overflow-hidden" aria-label="Today's numbers">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
            <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <p className="text-sm font-semibold text-muted">Today's productivity</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-4xl font-bold tracking-tight">{s.score}%</span>
                {s.total > 0 && (
                  <span className="text-sm text-muted">{s.goal_met ? "goal reached" : `goal ${data.daily_goal_percent}%`}</span>
                )}
              </div>
              <ProgressBar value={s.score} goal={data.daily_goal_percent} className="mt-4" />
              <p className="mt-4 flex items-center gap-1.5 text-sm">
                <Flame size={16} className={data.streak > 0 ? "text-accent" : "text-muted"} />
                <span className="num font-semibold">{data.streak}-day streak</span>
                {data.best_streak > data.streak && <span className="num text-muted">(best {data.best_streak})</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 divide-line sm:grid-cols-5 sm:divide-x">
              <Stat label="Planned" value={formatHours(s.planned_hours)} note={`${s.total} task${s.total === 1 ? "" : "s"}`} />
              <Stat label="Actual" value={formatHours(s.actual_hours)} note="productive time" />
              <Stat label="Completed" value={s.completed} note={`of ${s.total}`} />
              <Stat label="Pending" value={s.pending + s.partial} note={s.partial ? `${s.partial} partly done` : "still open"} />
              <Stat label="Missed" value={data.carry_over.filter((t) => t.status === "missed").length} note="last 7 days" />
            </div>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          {/* Today's tasks */}
          <section className="card" aria-label="Today's tasks">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Today's tasks</h2>
              <span className="num text-xs text-muted">{s.completed} of {s.total} done</span>
            </div>
            {data.tasks.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted">Nothing planned for today yet.</p>
                <button className="btn-quiet mt-3" onClick={openAdd}><Plus size={16} /> Plan your first task</button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {data.tasks.map((t) => (
                  <TaskItem key={t.id} task={t} onChanged={load} onEdit={openEdit} onReschedule={openReschedule} onError={setError} />
                ))}
              </ul>
            )}
          </section>

          <GrowthChart refreshKey={version} goal={data.daily_goal_percent} />
        </div>

        {/* Unfinished tasks from earlier days */}
        {data.carry_over.length > 0 && (
          <section className="card" aria-label="Unfinished tasks from earlier days">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Left over from earlier days</h2>
              <p className="mt-0.5 text-xs text-muted">Still worth doing? Give it a new date. Otherwise it's fine to let it go.</p>
            </div>
            <ul className="divide-y divide-line">
              {data.carry_over.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="num mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {relativeDay(t.task_date, data.today)}
                      <StatusBadge status={t.status} />
                      {formatHours(Math.max(t.planned_hours - t.actual_hours, 0))} left
                    </p>
                  </div>
                  <button className="btn-quiet shrink-0 py-1.5" onClick={() => openReschedule(t)}>
                    <CalendarClock size={15} /> Reschedule
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {dialogs}
    </>
  );
}
