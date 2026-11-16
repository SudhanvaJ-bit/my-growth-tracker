import { TrendingUp } from "lucide-react";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <TrendingUp size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">My Growth Tracker</span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-4 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}
