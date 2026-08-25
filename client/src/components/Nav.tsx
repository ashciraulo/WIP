import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Nav() {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1.5 text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-900">WIP Tracker</span>
        <NavLink to="/" end className={linkClass}>
          My Dashboard
        </NavLink>
        {(user?.role === "MANAGER" || user?.role === "ADMIN") && (
          <NavLink to="/manager" className={linkClass}>
            Manager View
          </NavLink>
        )}
        <NavLink to="/wip-meeting" className={linkClass}>
          WIP Meeting
        </NavLink>
        <NavLink to="/analytics" className={linkClass}>
          Analytics
        </NavLink>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>{user?.name}</span>
        <button onClick={logout} className="text-slate-400 hover:text-slate-700">
          Sign out
        </button>
      </div>
    </nav>
  );
}
