import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, SectionTitle, Skeleton, StatCard } from "../components/ui";
import { apiJson } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const ROLES = ["buyer", "individual_seller", "store_owner", "admin", "super_admin", "seller"];
const STAT_ICONS = { Users:"👥", Books:"📚", Orders:"📦", Transactions:"💳", Tenants:"🏢", "Pending offers":"🤝", Conversations:"💬" };

export default function AdminPage() {
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [savingId, setSavingId] = useState(null);

  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => apiJson("/api/admin/overview"), enabled: user?.role === "super_admin", retry: false });
  const users    = useQuery({ queryKey: ["admin-users"],    queryFn: () => apiJson("/api/admin/users?limit=100"), enabled: user?.role === "super_admin", retry: false });

  const patchRole = useMutation({
    mutationFn: ({ userId, role }) => apiJson(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
    onSettled: () => setSavingId(null),
  });

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-12"><Skeleton className="h-10" /></div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex justify-center animate-float">
          <div className="relative w-56 h-56">
            <div className="absolute inset-0 rounded-full bg-primary-200 opacity-40 blur-3xl" />
            <svg viewBox="0 0 220 220" className="relative drop-shadow-xl" fill="none">
              <circle cx="110" cy="110" r="70" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
              <text x="110" y="125" textAnchor="middle" fontSize="52">🔒</text>
            </svg>
          </div>
        </div>
        <div className="animate-fade-up text-center lg:text-left">
          <h1 className="text-3xl font-extrabold text-primary-900">Admin Panel</h1>
          <p className="mt-2 text-primary-500">Super admin access required.</p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow hover:bg-primary-700 transition">
            Sign in →
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex justify-center animate-float">
          <div className="relative w-56 h-56">
            <div className="absolute inset-0 rounded-full bg-primary-100 opacity-60 blur-3xl" />
            <svg viewBox="0 0 220 220" className="relative" fill="none">
              <circle cx="110" cy="110" r="70" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
              <text x="110" y="125" textAnchor="middle" fontSize="52">🔒</text>
            </svg>
          </div>
        </div>
        <div className="animate-fade-up">
          <h1 className="text-2xl font-extrabold text-primary-900">Access Restricted</h1>
          <p className="mt-2 text-primary-600">
            Your role is <strong>{user?.role}</strong>. Only{" "}
            <code className="rounded bg-primary-100 px-1 text-primary-700">super_admin</code> can access this page.
          </p>
          <p className="mt-3 text-sm text-primary-400">
            Set <code className="rounded bg-primary-50 px-1">ADMIN_SETUP_SECRET</code> in backend env and register with that secret.
          </p>
        </div>
      </div>
    );
  }

  const counts = overview.data?.counts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">

      {/* Hero */}
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center mb-10">
        <div className="animate-fade-up">
          <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
            ✦ Super Admin
          </span>
          <h1 className="text-3xl font-extrabold text-primary-900">
            Platform <span className="gradient-text">Overview</span>
          </h1>
          <p className="mt-2 text-primary-500">Manage users, monitor activity, and control roles across all tenants.</p>
        </div>
        <div className="flex justify-center animate-float">
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 rounded-full bg-primary-200 opacity-40 blur-3xl" />
            <svg viewBox="0 0 190 190" className="relative drop-shadow-xl" fill="none">
              <rect x="20"  y="100" width="30" height="70"  rx="6" fill="#2563eb" opacity=".9"/>
              <rect x="60"  y="70"  width="30" height="100" rx="6" fill="#3b82f6" opacity=".85"/>
              <rect x="100" y="40"  width="30" height="130" rx="6" fill="#60a5fa" opacity=".8"/>
              <rect x="140" y="60"  width="30" height="110" rx="6" fill="#93c5fd" opacity=".75"/>
              <circle cx="160" cy="30" r="7" fill="#38bdf8" opacity=".7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      {counts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[["Users",counts.users],["Books",counts.books],["Orders",counts.orders],["Transactions",counts.transactions],
            ["Tenants",counts.tenants],["Pending offers",counts.offers_pending],["Conversations",counts.conversations]
          ].map(([label, n], i) => (
            <StatCard key={label} icon={STAT_ICONS[label]} label={label} value={n} delay={i * 60} />
          ))}
        </div>
      )}

      {overview.isError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {String(overview.error?.message ?? "Failed to load overview")}
        </div>
      )}

      {/* Users table */}
      <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <SectionTitle>Users</SectionTitle>
        {users.isLoading && <Skeleton className="h-32" />}
        {users.isError && <p className="text-sm text-red-500">{String(users.error?.message)}</p>}
        {users.data?.users && (
          <Card className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-primary-50 bg-primary-50 text-xs uppercase tracking-wide text-primary-400">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {users.data.users.map((u) => (
                  <tr key={u._id} className="border-b border-primary-50 hover:bg-primary-50/50 transition">
                    <td className="px-4 py-2.5 font-mono text-xs text-primary-800">{u.email}</td>
                    <td className="px-4 py-2.5 text-primary-500">{u.tenant_id}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={u.email_verified ? "green" : "gray"}>
                        {u.email_verified ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        key={`${u._id}-${u.role}`}
                        className="rounded-lg border border-primary-200 bg-white px-2 py-1 text-xs text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        defaultValue={u.role}
                        disabled={patchRole.isPending && savingId === u._id}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === u.role) return;
                          setSavingId(u._id);
                          patchRole.mutate({ userId: u._id, role: next });
                        }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary-300">{u._id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-primary-50 px-4 py-2 text-xs text-primary-400">Total: {users.data.total}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
