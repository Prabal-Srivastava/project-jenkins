import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge, Btn, Card, SectionTitle, Skeleton, StatCard, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_COLOR = { available:"success", pending_payment:"warning", sold:"secondary" };

export default function StoreOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listings = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => apiJson("/api/dashboard/my-listings"),
  });

  const orders = useQuery({
    queryKey: ["orders-seller"],
    queryFn: () => apiJson("/api/orders/mine?side=seller"),
  });

  const deleteBook = useMutation({
    mutationFn: (bookId) => apiJson(`/api/books/${bookId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Book deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete book");
    },
  });

  const available = listings.data?.filter(b => b.status === "available").length ?? 0;
  const sold      = listings.data?.filter(b => b.status === "sold").length ?? 0;
  const pending   = orders.data?.filter(o => o.status === "paid_held").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="📚" label="Active listings" value={available} />
        <StatCard icon="✅" label="Books sold"      value={sold}      delay={60} />
        <StatCard icon="📦" label="Pending shipment" value={pending}  delay={120} />
      </div>

      {/* Storefront info */}
      <Card className="p-5">
        <SectionTitle>🏪 Your Storefront</SectionTitle>
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          <p>Your store URL: <span className="font-mono font-bold text-blue-900">
            /store/{user?.tenant_id}
          </span></p>
          <p className="mt-1 text-xs text-blue-600">Share this link with customers to show only your listings.</p>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-5">
        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Btn variant="primary" onClick={() => navigate("/sell")}>
            + Add New Book
          </Btn>
          <Btn variant="outline" onClick={() => navigate("/dashboard")}>
            📊 View Analytics
          </Btn>
        </div>
      </Card>

      {/* Bulk upload info */}
      <Card className="p-5">
        <SectionTitle>📤 Bulk Upload</SectionTitle>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-semibold mb-1">CSV / Excel bulk listing</p>
          <p className="text-xs text-amber-600 mb-3">
            Prepare a CSV with columns: <code className="bg-white px-1 rounded">title, isbn, author, price, condition_grade, city</code>
          </p>
          <p className="text-xs text-amber-600">Bulk upload API: <code className="bg-white px-1 rounded">POST /api/books/bulk</code> (coming soon)</p>
        </div>
      </Card>

      {/* Inventory */}
      <Card className="p-5">
        <SectionTitle>📋 Inventory</SectionTitle>
        {listings.isLoading && <Skeleton className="h-24" />}
        {listings.data?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No books listed yet</p>
            <Btn variant="primary" onClick={() => navigate("/sell")}>
              + List Your First Book
            </Btn>
          </div>
        )}
        <div className="space-y-2">
          {listings.data?.map(b => (
            <div key={b._id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 hover:shadow-md transition-shadow">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{b.title}</p>
                <p className="text-xs text-slate-500">ISBN {b.isbn} · {b.condition_grade}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="font-bold text-slate-900">₹{b.price}</span>
                <Badge variant={STATUS_COLOR[b.status] ?? "default"}>{b.status}</Badge>
                <div className="flex gap-1">
                  <Btn
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/book/${b._id}`)}
                    title="View details"
                  >
                    👁️
                  </Btn>
                  <Btn
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(`Delete "${b.title}"?`)) {
                        deleteBook.mutate(b._id);
                      }
                    }}
                    disabled={deleteBook.isPending}
                    title="Delete book"
                  >
                    🗑️
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* OMS */}
      <Card className="p-5">
        <SectionTitle>🗂 Order Management</SectionTitle>
        {orders.isLoading && <Skeleton className="h-16" />}
        {orders.data?.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
        <div className="space-y-2">
          {orders.data?.map(o => (
            <div key={o._id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm">
              <div>
                <p className="font-mono text-xs text-slate-500">{o.invoice_number}</p>
                <p className="font-semibold text-slate-900">₹{o.amount}</p>
              </div>
              <Badge variant={o.status === "delivered" ? "success" : o.status === "shipped" ? "default" : "warning"}>
                {o.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
