import { CalendarCheck, History, LayoutDashboard, LogOut, Moon, Settings, Sun, TrendingUp } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CalendarCheck },
  { to: "/history", label: "Progress History", short: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
        <TrendingUp size={18} strokeWidth={2.5} />
      </span>
      <span className="text-[15px] font-bold tracking-tight">My Growth Tracker</span>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Light theme" : "Dark theme";

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-sunken hover:text-ink"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-line pt-4">
          <p className="truncate px-3 pb-2 text-sm font-medium" title={user.email}>
            {user.name}
          </p>
          <button onClick={toggle} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink">
            <ThemeIcon size={18} />
            {themeLabel}
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink">
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={toggle} className="icon-btn" aria-label={themeLabel}>
          <ThemeIcon size={18} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface lg:hidden" aria-label="Main">
        {NAV.map(({ to, label, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? "text-accent" : "text-muted"}`
            }
          >
            <Icon size={20} />
            {short || label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
