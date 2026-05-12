import { useQuery } from "@tanstack/react-query";
import { Card, SkeletonCard, SkeletonTable, ErrorMessage, EmptyState } from "../../components/ui";
import { apiJson } from "../../lib/api";

export default function AdminCommissionsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: () => apiJson("/api/admin-panel/commissions"),
    retry: false,
  });

  const totalRevenue    = data?.reduce((s, r) => s + r.total_sales, 0) ?? 0;
  const totalCommission = data?.reduce((s, r) => s + r.platform_fee, 0) ?? 0;

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
  if (isError) return <ErrorMessage message={error?.message} />;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-primary-900 mb-6">💳 Commissions & Payouts</h2>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Total platform sales</p>
          <p className="mt-1 text-3xl font-extrabold text-primary-700">₹{totalRevenue.toFixed(2)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Platform commission (5%)</p>
          <p className="mt-1 text-3xl font-extrabold text-green-600">₹{totalCommission.toFixed(2)}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-primary-50 bg-primary-50 text-xs uppercase tracking-wide text-primary-400">
            <tr>
              <th className="px-4 py-3">Seller ID</th>
              <th className="px-4 py-3">Total Sales</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Platform Fee (5%)</th>
              <th className="px-4 py-3">Seller Payout</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r, i) => (
              <tr key={i} className="border-b border-primary-50 hover:bg-primary-50/50 transition">
                <td className="px-4 py-2.5 font-mono text-xs text-primary-600">{r.seller_id?.slice(0,12) ?? "—"}…</td>
                <td className="px-4 py-2.5 font-semibold text-primary-900">₹{r.total_sales}</td>
                <td className="px-4 py-2.5 text-primary-500">{r.count}</td>
                <td className="px-4 py-2.5 text-green-600 font-semibold">₹{r.platform_fee}</td>
                <td className="px-4 py-2.5 text-primary-700 font-semibold">₹{(r.total_sales - r.platform_fee).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
