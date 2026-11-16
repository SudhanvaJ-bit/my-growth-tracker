import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { formatDay, formatHours } from "../lib/dates";
import { useTheme } from "../lib/theme";

const RANGES = [
  { id: "1d", label: "1D", name: "today" },
  { id: "1w", label: "1W", name: "the past week" },
  { id: "1m", label: "1M", name: "the past month" },
  { id: "6m", label: "6M", name: "the past 6 months" },
  { id: "1y", label: "1Y", name: "the past year" },
  { id: "all", label: "All", name: "all time" },
];

const shortDate = (iso) => formatDay(iso, { day: "numeric", month: "short" });

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            value === o.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, colors, perTask }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const Row = ({ color, name, value }) => (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted">
        {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
        {name}
      </span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
  return (
    <div className="card min-w-[170px] space-y-1 px-3 py-2 text-xs shadow-lg">
      <p className="pb-0.5 text-sm font-semibold">{perTask ? d.title : formatDay(d.date)}</p>
      {!perTask && <Row name="Productivity" value={`${d.score}%`} />}
      <Row color={colors.planned} name="Planned" value={formatHours(d.planned_hours)} />
      <Row color={colors.actual} name="Actual" value={formatHours(d.actual_hours)} />
      {!perTask && <Row name="Tasks done" value={`${d.completed} of ${d.total}`} />}
    </div>
  );
}

function Legend({ colors }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.planned }} />Planned hours</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.actual }} />Actual hours</span>
    </div>
  );
}

// The stock-style graph. `refreshKey` changes whenever tasks change, so it reloads itself.
export default function GrowthChart({ refreshKey = 0, goal }) {
  const { chart: colors } = useTheme();
  const [range, setRange] = useState("1m");
  const [mode, setMode] = useState("score");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/stats?range=${range}`)
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  const perTask = range === "1d";
  const view = perTask ? "hours" : mode;
  const points = data?.points ?? [];
  const latest = points[points.length - 1];
  const change = data?.summary.change;
  const rangeName = RANGES.find((r) => r.id === range).name;

  const axis = { tick: { fill: colors.text, fontSize: 11 }, tickLine: false, axisLine: false };
  const grid = <CartesianGrid stroke={colors.grid} strokeDasharray="0" vertical={false} />;
  const tooltip = (
    <Tooltip
      content={<ChartTooltip colors={colors} perTask={perTask} />}
      cursor={view === "score" || points.length > 31 ? { stroke: colors.text, strokeWidth: 1 } : { fill: colors.grid, opacity: 0.4 }}
      isAnimationActive={false}
    />
  );
  const margin = { top: 8, right: 8, bottom: 0, left: -18 };

  let body;
  if (error) {
    body = <p className="flex h-full items-center justify-center text-sm text-muted">{error}</p>;
  } else if (!data) {
    body = <p className="flex h-full items-center justify-center text-sm text-muted">Loading…</p>;
  } else if (perTask ? data.tasks.length === 0 : points.length === 0) {
    body = (
      <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
        {perTask ? "No tasks planned today. Add one to see it here." : "No tasks in this period yet. Your graph starts with your first planned day."}
      </p>
    );
  } else if (perTask) {
    const rows = data.tasks.map((t) => ({ ...t, name: t.title.length > 14 ? t.title.slice(0, 13) + "…" : t.title }));
    body = (
      <ResponsiveContainer>
        <BarChart data={rows} margin={margin} barGap={2} barCategoryGap="28%">
          {grid}
          <XAxis dataKey="name" {...axis} interval={0} />
          <YAxis {...axis} unit="h" allowDecimals />
          {tooltip}
          <Bar dataKey="planned_hours" name="Planned" fill={colors.planned} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar dataKey="actual_hours" name="Actual" fill={colors.actual} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  } else if (view === "score") {
    body = (
      <ResponsiveContainer>
        <AreaChart data={points} margin={margin}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.actual} stopOpacity={0.22} />
              <stop offset="100%" stopColor={colors.actual} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={36} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" {...axis} />
          {goal != null && (
            <ReferenceLine y={goal} stroke={colors.text} strokeDasharray="4 4" strokeOpacity={0.7} />
          )}
          {tooltip}
          <Area
            type="linear"
            dataKey="score"
            stroke={colors.actual}
            strokeWidth={2}
            fill="url(#scoreFill)"
            dot={points.length <= 31 ? { r: 3, fill: colors.actual, stroke: colors.surface, strokeWidth: 2 } : false}
            activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  } else if (points.length <= 31) {
    body = (
      <ResponsiveContainer>
        <BarChart data={points} margin={margin} barGap={2} barCategoryGap="24%">
          {grid}
          <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={24} />
          <YAxis {...axis} unit="h" />
          {tooltip}
          <Bar dataKey="planned_hours" fill={colors.planned} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="actual_hours" fill={colors.actual} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  } else {
    body = (
      <ResponsiveContainer>
        <LineChart data={points} margin={margin}>
          {grid}
          <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={36} />
          <YAxis {...axis} unit="h" />
          {tooltip}
          <Line type="linear" dataKey="planned_hours" stroke={colors.planned} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="actual_hours" stroke={colors.actual} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Headline: like a stock ticker, but a dip is shown calmly rather than in red.
  const TrendIcon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const headline =
    view === "score" ? (
      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="num text-3xl font-bold tracking-tight">{latest ? `${latest.score}%` : "–"}</span>
          {change != null && (
            <span className={`num inline-flex items-center gap-0.5 text-sm font-semibold ${change > 0 ? "text-good" : "text-muted"}`}>
              <TrendIcon size={16} />
              {change > 0 ? "+" : ""}{change} pts
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {latest ? `Latest day, ${formatDay(latest.date)}` : "Productivity score"}
          {data?.summary.average_score != null && `. Average ${data.summary.average_score}% over ${rangeName}.`}
        </p>
      </div>
    ) : (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="num text-3xl font-bold tracking-tight">{data ? formatHours(data.summary.actual_hours) : "–"}</span>
          <span className="num text-sm text-muted">of {data ? formatHours(data.summary.planned_hours) : "–"} planned</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">Hours over {rangeName}</p>
      </div>
    );

  return (
    <section className="card p-4 sm:p-5" aria-label="Productivity graph">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted">{view === "score" ? "Productivity" : "Planned vs actual hours"}</h2>
          <div className="mt-1">{headline}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
          {!perTask && (
            <Segmented
              label="Graph type"
              options={[{ id: "score", label: "Score" }, { id: "hours", label: "Hours" }]}
              value={mode}
              onChange={setMode}
            />
          )}
        </div>
      </div>
      <div className="mt-4 h-64 w-full">{body}</div>
      {view === "hours" && <div className="mt-3"><Legend colors={colors} /></div>}
      {view === "score" && goal != null && points.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="w-5 border-t border-dashed border-muted" aria-hidden="true" />
          Your daily goal, {goal}%
        </p>
      )}
    </section>
  );
}
