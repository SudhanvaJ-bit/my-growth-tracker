import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./lib/auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";

function FullPageNote({ children }) {
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted">{children}</div>;
}

// Pages inside this route are only shown to logged-in users.
function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageNote>Loading…</FullPageNote>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageNote>Loading…</FullPageNote>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
