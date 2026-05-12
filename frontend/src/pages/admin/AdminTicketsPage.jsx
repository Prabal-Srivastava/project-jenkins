import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Btn, Card, Input, Skeleton, EmptyState, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

const STATUS_COLOR = { open:"red", in_review:"amber", resolved:"green", closed:"gray" };

export default function AdminTicketsPage() {
  const qc = useQueryClient();
  const [filter, setFilter]   = useState("open");
  const [note, setNote]       = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: () => apiJson(`/api/admin-panel/tickets${filter !== "all" ? `?status=${filter}` : ""}`),
    retry: false,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, resolution_note }) =>
      apiJson(`/api/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, resolution_note }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket status updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update ticket status");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-extrabold text-primary-900">🎫 Dispute Tickets</h2>
        <div className="flex gap-1">
          {["all","open","in_review","resolved","closed"].map(s => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === s ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-600 hover:bg-primary-100"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton count={3} className="h-32" />}
      {!isLoading && data?.length === 0 && <EmptyState icon="🎫" message="No tickets found." />}

      <div className="space-y-4">
        {data?.map(t => (
          <Card key={t._id} className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={STATUS_COLOR[t.status] ?? "blue"}>{t.status}</Badge>
                  <span className="text-xs font-mono text-primary-400">{t._id.slice(0,8)}…</span>
                </div>
                <p className="font-semibold text-primary-900">{t.subject}</p>
                <p className="text-xs text-primary-500 mt-0.5">{t.description}</p>
                <p className="text-xs text-primary-400 mt-1">
                  Buyer: {t.buyer_id?.slice(0,8)}… · Order: {t.order_id?.slice(0,8)}…
                </p>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <Input
                  placeholder="Resolution note…"
                  value={note[t._id] || ""}
                  onChange={e => setNote(n => ({...n, [t._id]: e.target.value}))}
                />
                <div className="flex gap-1 flex-wrap">
                  {["in_review","resolved","closed"].map(s => (
                    <Btn key={s} variant={s === "resolved" ? "primary" : "outline"}
                      className="text-xs py-1 px-2"
                      onClick={() => updateStatus.mutate({ id: t._id, status: s, resolution_note: note[t._id] })}>
                      → {s}
                    </Btn>
                  ))}
                </div>
              </div>
            </div>
            {t.messages?.length > 0 && (
              <div className="mt-3 border-t border-primary-50 pt-3 space-y-1">
                {t.messages.map((m, i) => (
                  <div key={i} className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-1.5">
                    <span className="font-mono text-primary-400">{m.sender_id?.slice(0,6)}…</span> {m.message}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
