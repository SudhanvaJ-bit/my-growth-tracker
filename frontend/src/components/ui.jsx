import { Check, CircleDashed, CircleDot, Clock } from "lucide-react";

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-soft/40 bg-soft/10 px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Status is always shown as icon + word, never colour alone.
const STATUS = {
  completed: { label: "Completed", icon: Check, cls: "text-good bg-good/10" },
  partial: { label: "Partly done", icon: CircleDot, cls: "text-accent bg-accent/10" },
  pending: { label: "Pending", icon: Clock, cls: "text-muted bg-sunken" },
  missed: { label: "Missed", icon: CircleDashed, cls: "text-soft bg-soft/10" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <Icon size={12} strokeWidth={2.5} />
      {s.label}
    </span>
  );
}

const PRIORITY = { high: "High", medium: "Medium", low: "Low" };

export function PriorityTag({ priority }) {
  const bars = { high: 3, medium: 2, low: 1 }[priority] || 2;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={`${PRIORITY[priority]} priority`}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] rounded-sm ${i <= bars ? "bg-ink/70" : "bg-line"}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {PRIORITY[priority]}
    </span>
  );
}

export function ProgressBar({ value, goal, className = "" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative h-2 rounded-full bg-sunken ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      {goal != null && (
        <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink/50" style={{ left: `${goal}%` }} title={`Daily goal ${goal}%`} />
      )}
    </div>
  );
}
