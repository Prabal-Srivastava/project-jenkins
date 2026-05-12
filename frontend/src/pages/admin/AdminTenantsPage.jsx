import { useQuery } from "@tanstack/react-query";
import { Card, SkeletonTable, ErrorMessage, EmptyState } from "../../components/ui";
import { apiJson } from "../../lib/api";

export default function AdminTenantsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => apiJson("/api/tenants"),
    retry: false,
  });

  if (isLoading) return <SkeletonTable rows={5} cols={3} />;
  if (isError)   return <ErrorMessage message={error?.message} />;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-primary-900 mb-6">Tenants</h2>
      {data?.length === 0 ? (
        <EmptyState icon="🏢" message="No tenants found." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-primary-50 bg-primary-50 text-xs uppercase tracking-wide text-primary-400">
              <tr>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((t) => (
                <tr key={t._id} className="border-b border-primary-50 hover:bg-primary-50/50 transition">
                  <td className="px-4 py-2.5 font-mono text-xs text-primary-700">{t.slug}</td>
                  <td className="px-4 py-2.5 text-primary-800">{t.name}</td>
                  <td className="px-4 py-2.5 text-xs text-primary-400">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
