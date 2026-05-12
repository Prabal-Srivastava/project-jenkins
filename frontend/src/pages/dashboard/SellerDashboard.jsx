import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Btn, Card, Input, SectionTitle, Skeleton, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

const CONDITION_GRADES = ["New", "Like New", "Good", "Fair", "Worn"];
const CONDITION_INFO = {
  New:       { color: "bg-green-100 text-green-800",  desc: "Unused, no marks" },
  "Like New": { color: "bg-blue-100 text-blue-800",   desc: "Minimal use, no damage" },
  Good:      { color: "bg-primary-100 text-primary-800", desc: "Some wear, fully readable" },
  Fair:      { color: "bg-amber-100 text-amber-800",  desc: "Visible wear, intact" },
  Worn:      { color: "bg-red-100 text-red-800",      desc: "Heavy use, may have marks" },
};

function ConditionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {CONDITION_GRADES.map(g => (
        <button key={g} type="button" onClick={() => onChange(g)}
          className={`rounded-xl border-2 p-2 text-xs font-semibold transition ${
            value === g ? "border-primary-600 " + CONDITION_INFO[g].color : "border-primary-100 bg-white text-primary-600 hover:border-primary-300"
          }`}>
          <p>{g}</p>
          <p className="text-xs font-normal opacity-70 mt-0.5 hidden sm:block">{CONDITION_INFO[g].desc}</p>
        </button>
      ))}
    </div>
  );
}

// Single photo slot: toggle between file upload and URL paste
function PhotoSlot({ label, value, onChange }) {
  const [mode, setMode] = useState("upload"); // "upload" | "url"
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation before upload
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG or PNG images allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: fd,
        credentials: "include",
        // Do NOT set Content-Type — browser sets it with boundary automatically
      });

      let body;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text.includes("413") ? "File too large (max 5 MB)" : `Server error: ${res.status}`);
      }

      if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);

      onChange(body.url);
      toast.success(`${label} photo saved`);
    } catch (err) {
      toast.error(err.message || "Upload failed");
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 capitalize">{label} photo <span className="text-red-500">*</span></p>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
          <button type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-1 transition ${mode === "upload" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            📁 Upload
          </button>
          <button type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-1 transition ${mode === "url" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            🔗 URL
          </button>
        </div>
      </div>

      {/* Preview */}
      {value && (
        <div className="relative group">
          <img src={value} alt={label} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
          <button type="button"
            onClick={() => { onChange(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            ✕
          </button>
        </div>
      )}

      {mode === "upload" ? (
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
          <button type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-50">
            {uploading ? "Uploading…" : value ? "Replace image" : "Click to choose file"}
          </button>
        </div>
      ) : (
        <Input
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={value ? "border-green-400" : "border-slate-300"}
        />
      )}
    </div>
  );
}

export default function SellerDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", isbn: "", author: "", price: "",
    condition_grade: "Good",
    condition_report: { rating: 3, notes: "", images: { cover: "", spine: "", page: "" } },
    city: "", category: "", allow_offers: false, image_url: "",
  });
  const [trackingMap, setTrackingMap] = useState({});

  const listings = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => apiJson("/api/dashboard/my-listings"),
  });

  const orders = useQuery({
    queryKey: ["orders-seller"],
    queryFn: () => apiJson("/api/orders/mine?side=seller"),
  });

  const createBook = useMutation({
    mutationFn: () => apiJson("/api/books", { method: "POST", body: JSON.stringify({
      ...form,
      price: parseFloat(form.price),
      sale_type: "fixed",
    })}),
    onSuccess: () => {
      setShowForm(false);
      setForm({
        title: "", isbn: "", author: "", price: "",
        condition_grade: "Good",
        condition_report: { rating: 3, notes: "", images: { cover: "", spine: "", page: "" } },
        city: "", category: "", allow_offers: false, image_url: "",
      });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Book listed successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to list book");
    },
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

  const shipOrder = useMutation({
    mutationFn: (orderId) => apiJson(`/api/orders/${orderId}/ship`, {
      method: "POST",
      body: JSON.stringify({ tracking_number: trackingMap[orderId] || null }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-seller"] });
      toast.success("Order marked as shipped");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to ship order");
    },
  });

  const setImg = (key, val) => setForm(f => ({
    ...f,
    condition_report: { ...f.condition_report, images: { ...f.condition_report.images, [key]: val } },
  }));

  const photosMissing = !form.condition_report.images.cover ||
                        !form.condition_report.images.spine ||
                        !form.condition_report.images.page;

  return (
    <div className="space-y-6">
      {/* Quick lister */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>📚 My Inventory</SectionTitle>
          <Btn variant="primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? "✕ Cancel" : "+ List a book"}
          </Btn>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50 p-5 space-y-4">
            <h3 className="font-bold text-primary-900">New Listing</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              <Input placeholder="ISBN *" value={form.isbn}  onChange={e => setForm(f => ({...f, isbn: e.target.value}))} />
              <Input placeholder="Author" value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} />
              <Input placeholder="Price (₹) *" type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} />
              <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
            </div>

            {/* Main cover image */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-700 mb-2">🖼️ Main Cover Image <span className="text-slate-400 font-normal text-xs">(optional)</span></p>
              <PhotoSlot
                label="cover image"
                value={form.image_url}
                onChange={val => setForm(f => ({...f, image_url: val}))}
              />
            </div>

            {/* Condition Assessment Engine */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-1">📋 Condition Assessment <span className="text-red-500">*</span></p>
              <p className="text-xs text-amber-600 mb-3">Accurate condition reduces disputes and builds buyer trust.</p>
              <ConditionPicker value={form.condition_grade}
                onChange={g => setForm(f => ({...f, condition_grade: g,
                  condition_report: {...f.condition_report, rating: CONDITION_GRADES.indexOf(g) <= 1 ? 5 : CONDITION_GRADES.indexOf(g) === 2 ? 3 : 2}}))} />
              <textarea
                className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                rows={2} placeholder="Condition notes (highlights, torn pages, stamps…)"
                value={form.condition_report.notes}
                onChange={e => setForm(f => ({...f, condition_report: {...f.condition_report, notes: e.target.value}}))}
              />
            </div>

            {/* 3 mandatory photos */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-700 mb-1">📸 Condition Photos</p>
              <p className="text-xs text-blue-500 mb-3">Upload files or paste URLs for cover, spine, and an inner page.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {["cover", "spine", "page"].map(k => (
                  <PhotoSlot
                    key={k}
                    label={k}
                    value={form.condition_report.images[k]}
                    onChange={val => setImg(k, val)}
                  />
                ))}
              </div>
              {photosMissing && (
                <p className="mt-2 text-xs text-red-600 font-semibold">⚠ All 3 photos are required before listing.</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-primary-700 cursor-pointer">
              <input type="checkbox" checked={form.allow_offers}
                onChange={e => setForm(f => ({...f, allow_offers: e.target.checked}))}
                className="rounded" />
              Allow buyers to make offers
            </label>

            {createBook.isError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {createBook.error?.message}
              </p>
            )}

            <Btn variant="primary" className="w-full" onClick={() => createBook.mutate()}
              disabled={createBook.isPending || photosMissing || !form.title || !form.isbn || !form.price}>
              {createBook.isPending ? "Listing…" : "Publish listing →"}
            </Btn>
          </div>
        )}

        {listings.isLoading && <Skeleton className="h-24" />}
        {listings.data?.length === 0 && <p className="text-sm text-primary-400">No listings yet. Click "+ List a book" to start.</p>}
        <div className="space-y-2">
          {listings.data?.map(b => (
            <div key={b._id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 hover:shadow-md transition-shadow">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{b.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONDITION_INFO[b.condition_grade]?.color ?? "bg-slate-100 text-slate-700"}`}>
                    {b.condition_grade}
                  </span>
                  <span className="text-xs text-slate-500">ISBN {b.isbn}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="font-bold text-slate-900">₹{b.price}</span>
                <Badge variant={b.status === "available" ? "success" : b.status === "sold" ? "secondary" : "warning"}>
                  {b.status}
                </Badge>
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

      {/* Orders to ship */}
      <Card className="p-5">
        <SectionTitle>🚚 Orders to Ship</SectionTitle>
        {orders.isLoading && <Skeleton className="h-16" />}
        {orders.data?.filter(o => o.status === "paid_held").length === 0 && (
          <p className="text-sm text-primary-400">No orders awaiting shipment.</p>
        )}
        <div className="space-y-3">
          {orders.data?.filter(o => o.status === "paid_held").map(o => (
            <div key={o._id} className="rounded-xl border border-primary-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-primary-400">{o.invoice_number}</p>
                <span className="font-bold text-primary-700">₹{o.amount}</span>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Tracking number (optional)"
                  value={trackingMap[o._id] || ""}
                  onChange={e => setTrackingMap(m => ({...m, [o._id]: e.target.value}))} />
                <Btn variant="primary" className="shrink-0"
                  onClick={() => shipOrder.mutate(o._id)}
                  disabled={shipOrder.isPending}>
                  Mark shipped
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
