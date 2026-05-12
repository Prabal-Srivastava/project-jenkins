import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Btn, Badge } from "./ui";
import { TENANT_ID } from "../lib/tenant";

const NAV_LINKS = [
  { to: "/", label: "Catalog", icon: "📚", end: true },
  { to: "/sell", label: "Sell", icon: "💰", end: false },
  { to: "/dashboard", label: "Dashboard", icon: "📊", end: false },
  { to: "/chat", label: "Messages", icon: "💬", end: false },
  { to: "/profile", label: "Profile", icon: "👤", end: false },
];

const ROLE_CONFIG = {
  super_admin: { label: "Admin", variant: "destructive" },
  admin: { label: "Admin", variant: "destructive" },
  store_owner: { label: "Store", variant: "default" },
  individual_seller: { label: "Seller", variant: "warning" },
  buyer: { label: "Buyer", variant: "success" },
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const roleConfig = user ? (ROLE_CONFIG[user.role] ?? { label: user.role, variant: "default" }) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-blue-600 opacity-20 blur-md group-hover:opacity-30 transition-opacity" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-shadow">
              PB
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Purani Books</span>
            <p className="text-xs text-slate-600 -mt-0.5">Used Book Marketplace</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
          
          {user?.role === "super_admin" && (
            <NavLink
              to="/admin-panel"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-red-600 text-white shadow-md"
                    : "text-red-600 hover:bg-red-50 border border-red-200"
                }`
              }
            >
              <span>⚡</span>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {TENANT_ID}
          </Badge>

          {loading ? (
            <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <Badge variant={roleConfig.variant} className="text-xs">
                  {roleConfig.label}
                </Badge>
                <span className="text-sm font-medium text-slate-700 max-w-[140px] truncate">
                  {user.email.split('@')[0]}
                </span>
              </div>
              <Btn variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Btn>
            </div>
          ) : (
            <Btn size="sm" onClick={() => navigate("/login")}>
              Sign in
            </Btn>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 animate-fade-in shadow-lg">
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-800 hover:bg-slate-100"
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}

          {user?.role === "super_admin" && (
            <NavLink
              to="/admin-panel"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "bg-red-600 text-white" : "text-red-600 hover:bg-red-50"
                }`
              }
            >
              <span className="text-lg">⚡</span>
              Admin Panel
            </NavLink>
          )}

          <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-4">
                  <Badge variant={roleConfig?.variant}>{roleConfig?.label}</Badge>
                  <span className="text-sm text-slate-600 truncate">{user.email}</span>
                </div>
                <Btn variant="outline" className="w-full" onClick={handleLogout}>
                  🚪 Logout
                </Btn>
              </>
            ) : (
              <Btn className="w-full" onClick={() => { setOpen(false); navigate("/login"); }}>
                Sign in
              </Btn>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
