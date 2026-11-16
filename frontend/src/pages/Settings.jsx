import { LogOut, Moon, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { ErrorNote, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

function Section({ title, description, children }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Saved({ show }) {
  return show ? <span role="status" className="text-sm font-medium text-good">Saved</span> : null;
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, timezone: user.timezone, daily_goal_percent: user.daily_goal_percent });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => {
    try {
      const list = Intl.supportedValuesOf("timeZone");
      return list.includes(user.timezone) ? list : [user.timezone, ...list];
    } catch {
      return null; // older browsers: fall back to a text box
    }
  }, [user.timezone]);

  const set = (key) => (e) => (setSaved(false), setForm((f) => ({ ...f, [key]: e.target.value })));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setUser(await api.patch("/api/users/me", { ...form, daily_goal_percent: Number(form.daily_goal_percent) }));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-name">Name</label>
          <input id="s-name" className="field" value={form.name} onChange={set("name")} maxLength={80} required />
        </div>
        <div>
          <label className="label" htmlFor="s-email">Email</label>
          <input id="s-email" className="field text-muted" value={user.email} disabled />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="s-tz">Time zone</label>
        {zones ? (
          <select id="s-tz" className="field" value={form.timezone} onChange={set("timezone")}>
            {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select>
        ) : (
          <input id="s-tz" className="field" value={form.timezone} onChange={set("timezone")} />
        )}
        <p className="mt-1 text-xs text-muted">Decides when your day starts and ends.</p>
      </div>
      <div>
        <label className="label" htmlFor="s-goal">Daily goal: <span className="num">{form.daily_goal_percent}%</span></label>
        <input id="s-goal" type="range" min="10" max="100" step="5" className="w-full accent-[rgb(var(--accent))]" value={form.daily_goal_percent} onChange={set("daily_goal_percent")} />
        <p className="mt-1 text-xs text-muted">A day counts towards your streak when its productivity reaches this level.</p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <Saved show={saved} />
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => (setSaved(false), setForm((f) => ({ ...f, [key]: e.target.value })));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.new_password.length < 8) return setError("Use a new password of at least 8 characters.");
    setBusy(true);
    try {
      await api.post("/api/users/me/password", form);
      setForm({ current_password: "", new_password: "" });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-current">Current password</label>
          <input id="p-current" type="password" className="field" value={form.current_password} onChange={set("current_password")} autoComplete="current-password" required />
        </div>
        <div>
          <label className="label" htmlFor="p-new">New password</label>
          <input id="p-new" type="password" className="field" value={form.new_password} onChange={set("new_password")} autoComplete="new-password" maxLength={72} required />
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex items-center gap-3">
        <button className="btn-quiet" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        <Saved show={saved} />
      </div>
    </form>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-5">
        <Section title="Profile and goal">
          <ProfileForm />
        </Section>

        <Section title="Appearance">
          <div className="inline-flex rounded-lg bg-sunken p-0.5" role="group" aria-label="Theme">
            {[{ id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                aria-pressed={theme === id}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold ${theme === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Password">
          <PasswordForm />
        </Section>

        <Section title="Account" description="Logging out only affects this device.">
          <button className="btn-quiet" onClick={logout}><LogOut size={16} /> Log out</button>
        </Section>
      </div>
    </>
  );
}
