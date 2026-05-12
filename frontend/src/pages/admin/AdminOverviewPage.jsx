import { useQuery } from "@tanstack/react-query";
import { StatCard, Skeleton, SkeletonCard, Card, SectionTitle } from "../../components/ui";
import { apiJson } from "../../lib/api";

const STAT_ICONS = {
  users:"👥", books:"📚", orders:"📦", transactions:"💳",
  tenants:"🏢", offers_pending:"🤝", conversations:"💬",
  open_tickets:"🎫", pending_approvals:"⏳",
};

const COND_COLOR = { New:"bg-green-500", "Like New":"bg-blue-500", Good:"bg-primary-500", Fair:"bg-amber-500", Worn:"bg-red-400" };

export default function AdminOverviewPage() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiJson("/api/admin-panel/overview"),
    retry: false,
  });

  const analytics = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => apiJson("/api/analytics/summary"),
    retry: false,
  });

  if (overview.isLoading) return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  const counts = overview.data?.counts ?? {};
  const ana    = analytics.data ?? {};

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-extrabold text-primary-900">Platform Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(counts).map(([key, val], i) => {
          const label = key === "offers_pending" ? "Pending offers"
                      : key === "open_tickets"   ? "Open tickets"
                      : key === "pending_approvals" ? "Pending approvals"
                      : key.charAt(0).toUpperCase() + key.slice(1);
          return <StatCard key={key} icon={STAT_ICONS[key] ?? "📌"} label={label} value={val} delay={i * 50} />;
        })}
      </div>

      {ana.revenue_this_month !== undefined && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Revenue this month</p>
            <p className="mt-1 text-3xl font-extrabold text-green-600">₹{ana.revenue_this_month}</p>
            <p className="text-xs text-primary-400 mt-1">{ana.sales_this_month} sales</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Active listings</p>
            <p className="mt-1 text-3xl font-extrabold text-primary-700">{ana.active_listings}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Open disputes</p>
            <p className={`mt-1 text-3xl font-extrabold ${ana.open_tickets > 0 ? "text-red-600" : "text-green-600"}`}>
              {ana.open_tickets}
            </p>
          </Card>
        </div>
      )}

      {ana.condition_distribution?.length > 0 && (
        <Card className="p-5">
          <SectionTitle>📊 Condition Distribution</SectionTitle>
          <div className="space-y-2">
            {ana.condition_distribution.map(c => {
              const total = ana.condition_distribution.reduce((s, x) => s + x.count, 0);
              const pct   = total ? Math.round((c.count / total) * 100) : 0;
              return (
                <div key={c.grade} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-semibold text-primary-700">{c.grade}</span>
                  <div className="flex-1 h-3 rounded-full bg-primary-100 overflow-hidden">
                    <div className={`h-full rounded-full ${COND_COLOR[c.grade] ?? "bg-primary-400"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-primary-500 w-16 text-right">{c.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {ana.top_categories?.length > 0 && (
        <Card className="p-5">
          <SectionTitle>🏷 Top Categories</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {ana.top_categories.map(c => (
              <span key={c.category} className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                {c.category || "Uncategorized"} · {c.count}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}