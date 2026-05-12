import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Btn, Card, SkeletonTable, ErrorMessage, EmptyState, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

const ROLES = ["buyer", "individual_seller", "store_owner", "super_admin"];
const ROLE_FILTERS = ["all", "buyer", "individual_seller", "store_owner", "super_admin"];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [savingId, setSavingId]     = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", roleFilter],
    queryFn: () => apiJson(`/api/admin-panel/users?limit=200${roleFilter !== "all" ? `&role=${roleFilter}` : ""}`),
    retry: false,
  });

  const patchRole = useMutation({
    mutationFn: ({ userId, role }) =>
      apiJson(`/api/admin-panel/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update user role");
    },
    onSettled: () => setSavingId(null),
  });

  const userAction = useMutation({
    mutationFn: ({ userId, action }) =>
      apiJson(`/api/admin-panel/users/${userId}/action`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      const messages = {
        approve: "User approved successfully",
        block: "User blocked successfully",
        unblock: "User unblocked successfully",
      };
      toast.success(messages[variables.action] || "Action completed");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to perform action");
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin-panel/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete user");
    },
  });

  if (isLoading) return <SkeletonTable rows={10} cols={7} />;
  if (isError)   return <ErrorMessage message={error?.message} />;

  // Pending approvals queue
  const pendingApprovals = data?.users?.filter(u =>
    u.approved === false && ["individual_seller","store_owner"].includes(u.role)
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Pending approvals */}
      {pendingApprovals.length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <h3 className="font-bold text-amber-800 mb-3">⏳ Pending Seller Approvals ({pendingApprovals.length})</h3>
          <div className="space-y-2">
            {pendingApprovals.map(u => (
              <div key={u._id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-amber-100">
                <div>
                  <p className="text-sm font-mono text-primary-800">{u.email}</p>
                  <p className="text-xs text-primary-400">{u.role} · {u.tenant_id}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="primary" className="text-xs py-1 px-3"
                    onClick={() => userAction.mutate({ userId: u._id, action: "approve" })}>
                    ✅ Approve
                  </Btn>
                  <Btn variant="danger" className="text-xs py-1 px-3"
                    onClick={() => userAction.mutate({ userId: u._id, action: "block" })}>
                    🚫 Block
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All users */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-primary-900">Users</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary-400">Total: {data?.total}</span>
            <select
              className="rounded-lg border border-primary-200 bg-white px-2 py-1 text-xs text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              {ROLE_FILTERS.map(r => <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>)}
            </select>
          </div>
        </div>

        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-primary-50 bg-primary-50 text-xs uppercase tracking-wide text-primary-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map(u => (
                <tr key={u._id} className="border-b border-primary-50 hover:bg-primary-50/50 transition">
                  <td className="px-4 py-2.5 font-mono text-xs text-primary-800">{u.email}</td>
                  <td className="px-4 py-2.5 text-primary-500">{u.tenant_id}</td>
                  <td className="px-4 py-2.5">
                    {u.blocked
                      ? <Badge color="red">Blocked</Badge>
                      : u.approved === false
                        ? <Badge color="amber">Pending</Badge>
                        : <Badge color="green">Active</Badge>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-xs text-primary-600">
                    {u.avg_rating ? `⭐ ${u.avg_rating} (${u.review_count})` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-primary-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      key={`${u._id}-${u.role}`}
                      defaultValue={u.role}
                      disabled={patchRole.isPending && savingId === u._id}
                      onChange={e => {
                        if (e.target.value === u.role) return;
                        setSavingId(u._id);
                        patchRole.mutate({ userId: u._id, role: e.target.value });
                      }}
                      className="rounded-lg border border-primary-200 bg-white px-2 py-1 text-xs text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {!u.approved && !u.blocked && (
                        <button type="button" title="Approve"
                          onClick={() => userAction.mutate({ userId: u._id, action: "approve" })}
                          className="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          ✅
                        </button>
                      )}
                      {!u.blocked ? (
                        <button type="button" title="Block"
                          onClick={() => userAction.mutate({ userId: u._id, action: "block" })}
                          className="rounded px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                          🚫
                        </button>
                      ) : (
                        <button type="button" title="Unblock"
                          onClick={() => userAction.mutate({ userId: u._id, action: "unblock" })}
                          className="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          ✅
                        </button>
                      )}
                      <button type="button" title="Delete User"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete user ${u.email}? This action cannot be undone.`)) {
                            deleteUser.mutate(u._id);
                          }
                        }}
                        className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-primary-50 px-4 py-2 text-xs text-primary-400">Total: {data?.total}</p>
        </Card>
      </div>
    </div>
  );
}
