import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Btn, Card, Input, Skeleton, ErrorMessage, EmptyState, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [name, setName]   = useState("");
  const [slug, setSlug]   = useState("");
  const [icon, setIcon]   = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson("/api/categories"),
  });

  const create = useMutation({
    mutationFn: () => apiJson("/api/categories", { method: "POST", body: JSON.stringify({ name, slug, icon }) }),
    onSuccess: () => { 
      setName(""); 
      setSlug(""); 
      setIcon(""); 
      qc.invalidateQueries({ queryKey: ["categories"] }); 
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create category");
    },
  });

  const del = useMutation({
    mutationFn: (id) => apiJson(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete category");
    },
  });

  return (
    <div>
      <h2 className="text-xl font-extrabold text-primary-900 mb-6">🏷 Book Categories</h2>

      <Card className="p-5 mb-6">
        <h3 className="font-bold text-primary-900 mb-3">Add Category</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Name (e.g. Engineering)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Slug (e.g. engineering)"  value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g,"-"))} />
          <Input placeholder="Icon emoji (e.g. ⚙️)"    value={icon} onChange={e => setIcon(e.target.value)} />
        </div>
        <ErrorMessage message={create.error?.message} />
        <Btn variant="primary" className="mt-3" onClick={() => create.mutate()} disabled={!name || !slug || create.isPending}>
          + Add category
        </Btn>
      </Card>

      {isLoading && <Skeleton count={6} className="h-20" />}
      {!isLoading && data?.length === 0 && <EmptyState icon="🏷" message="No categories yet." />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map(c => (
          <Card key={c._id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{c.icon || "📚"}</span>
              <div>
                <p className="font-semibold text-primary-900 text-sm">{c.name}</p>
                <p className="text-xs text-primary-400 font-mono">{c.slug}</p>
              </div>
            </div>
            <button type="button" onClick={() => del.mutate(c._id)}
              className="text-red-400 hover:text-red-600 text-sm transition">
              🗑
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
