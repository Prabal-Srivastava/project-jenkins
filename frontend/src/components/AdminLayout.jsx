import { NavLink, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

const ADMIN_NAV = [
  { to: "/admin-panel",              label: "📊 Overview",     end: true  },
  { to: "/admin-panel/users",        label: "👥 Users",         end: false },
  { to: "/admin-panel/books",        label: "📚 Books",         end: false },
  { to: "/admin-panel/tickets",      label: "🎫 Disputes",      end: false },
  { to: "/admin-panel/commissions",  label: "💳 Commissions",   end: false },
  { to: "/admin-panel/categories",   label: "🏷 Categories",    end: false },
  { to: "/admin-panel/tenants",      label: "🏢 Tenants",       end: false },
];

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 shrink-0 bg-slate-900 text-white flex flex-col">
          <div className="px-4 py-4 border-b border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Admin Panel</p>
            <p className="text-sm font-bold text-white truncate">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
              {user?.tenant_id}
            </span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {ADMIN_NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
