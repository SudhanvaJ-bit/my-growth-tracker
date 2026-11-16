import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorNote } from "../components/ui";
import { useAuth } from "../lib/auth";
import AuthShell from "./AuthShell";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Plan your day, log your hours, see your consistency grow."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-accent hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="field" value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={form.email} onChange={set("email")} autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" value={form.password} onChange={set("password")} autoComplete="new-password" maxLength={72} required />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
