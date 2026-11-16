import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorNote } from "../components/ui";
import { useAuth } from "../lib/auth";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Pick up where you left off."
      footer={<>New here? <Link to="/register" className="font-semibold text-accent hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
    </AuthShell>
  );
}
