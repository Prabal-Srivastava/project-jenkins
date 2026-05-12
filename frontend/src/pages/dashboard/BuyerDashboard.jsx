import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExpiryTimer } from "../../components/ExpiryTimer";
import { Badge, Btn, Card, Input, SectionTitle, Skeleton, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

const ORDER_COLOR = { pending_payment:"amber", paid_held:"blue", shipped:"purple", delivered:"green", cancelled:"gray", refunded:"red" };

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition ${n <= value ? "text-amber-400" : "text-primary-200 hover:text-amber-300"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function BuyerDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [condAcc, setCondAcc]   = useState(5);
  const [sellerR, setSellerR]   = useState(5);
  const [comment, setComment]   = useState("");
  const [ticketOrderId, setTicketOrderId] = useState(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc]       = useState("");

  const orders = useQuery({
    queryKey: ["orders-buyer"],
    queryFn: () => apiJson("/api/orders/mine?side=buyer"),
  });

  const offers = useQuery({
    queryKey: ["my-offers"],
    queryFn: () => apiJson("/api/offers/mine?role=buyer"),
  });

  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => apiJson("/api/dashboard/wishlist"),
  });

  const confirmDelivery = useMutation({
    mutationFn: (orderId) => apiJson(`/api/orders/${orderId}/confirm-delivery`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-buyer"] });
      toast.success("Delivery confirmed!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to confirm delivery");
    },
  });

  const submitReview = useMutation({
    mutationFn: () => apiJson("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ order_id: reviewOrderId, condition_accuracy: condAcc, seller_rating: sellerR, comment }),
    }),
    onSuccess: () => {
      setReviewOrderId(null);
      qc.invalidateQueries({ queryKey: ["orders-buyer"] });
      toast.success("Review submitted successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to submit review");
    },
  });

  const raiseTicket = useMutation({
    mutationFn: () => apiJson("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ order_id: ticketOrderId, subject: ticketSubject, description: ticketDesc }),
    }),
    onSuccess: () => {
      setTicketOrderId(null);
      setTicketSubject("");
      setTicketDesc("");
      toast.success("Dispute ticket created");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create ticket");
    },
  });

  return (
    <div className="space-y-6">
      {/* Orders */}
      <Card className="p-5">
        <SectionTitle>📦 My Orders</SectionTitle>
        {orders.isLoading && <Skeleton className="h-24" />}
        {orders.data?.length === 0 && <p className="text-sm text-primary-400">No orders yet.</p>}
        <div className="space-y-3">
          {orders.data?.map(o => (
            <div key={o._id} className="rounded-xl border border-primary-100 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-mono text-primary-400">{o.invoice_number}</p>
                  <p className="font-semibold text-primary-900">${o.amount}</p>
                </div>
                <Badge color={ORDER_COLOR[o.status] ?? "blue"}>{o.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {o.status === "shipped" && (
                  <Btn variant="primary" className="text-xs py-1 px-3"
                    onClick={() => confirmDelivery.mutate(o._id)}
                    disabled={confirmDelivery.isPending}>
                    ✅ Confirm delivery
                  </Btn>
                )}
                {o.status === "delivered" && (
                  <Btn variant="outline" className="text-xs py-1 px-3"
                    onClick={() => setReviewOrderId(o._id)}>
                    ⭐ Write review
                  </Btn>
                )}
                {["paid_held","shipped","delivered"].includes(o.status) && (
                  <Btn variant="ghost" className="text-xs py-1 px-3 text-red-500"
                    onClick={() => { setTicketOrderId(o._id); setTicketSubject(""); setTicketDesc(""); }}>
                    🚨 Raise dispute
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Review modal */}
      {reviewOrderId && (
        <Card className="p-5 border-amber-200">
          <SectionTitle>⭐ Review Order</SectionTitle>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-primary-700 mb-1">Condition accuracy (did it match the description?)</p>
              <StarRating value={condAcc} onChange={setCondAcc} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary-700 mb-1">Seller rating</p>
              <StarRating value={sellerR} onChange={setSellerR} />
            </div>
            <Input placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} />
            <div className="flex gap-2">
              <Btn variant="primary" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
                Submit review
              </Btn>
              <Btn variant="ghost" onClick={() => setReviewOrderId(null)}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Dispute ticket modal */}
      {ticketOrderId && (
        <Card className="p-5 border-red-200">
          <SectionTitle>🚨 Raise Dispute</SectionTitle>
          <div className="space-y-3">
            <Input placeholder="Subject (e.g. Book condition worse than described)"
              value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} />
            <textarea
              className="w-full rounded-xl border border-primary-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              rows={4} placeholder="Describe the issue in detail…"
              value={ticketDesc} onChange={e => setTicketDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <Btn variant="danger" onClick={() => raiseTicket.mutate()} disabled={raiseTicket.isPending}>
                Submit ticket
              </Btn>
              <Btn variant="ghost" onClick={() => setTicketOrderId(null)}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Offers */}
      <Card className="p-5">
        <SectionTitle>🤝 My Offers</SectionTitle>
        {offers.isLoading && <Skeleton className="h-16" />}
        {offers.data?.length === 0 && <p className="text-sm text-primary-400">No offers yet.</p>}
        <ul className="space-y-2">
          {offers.data?.map(o => (
            <li key={o._id} className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-2.5">
              <span className="font-bold text-primary-700">${o.offer_amount}</span>
              <div className="flex items-center gap-2">
                {o.expires_at && o.status === "pending" && <ExpiryTimer expiresAt={o.expires_at} />}
                <Badge color={o.status === "accepted" ? "green" : o.status === "rejected" ? "red" : "amber"}>
                  {o.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Wishlist */}
      <Card className="p-5">
        <SectionTitle>❤️ Wishlist</SectionTitle>
        {wishlist.isLoading && <Skeleton className="h-16" />}
        {wishlist.data?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">Your wishlist is empty</p>
            <Btn variant="primary" onClick={() => navigate("/")}>
              Browse Books
            </Btn>
          </div>
        )}
        <ul className="space-y-2">
          {wishlist.data?.map(b => (
            <li key={b._id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm hover:shadow-md transition-shadow">
              <span className="font-medium text-slate-900 truncate">{b.title}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">₹{b.price}</span>
                <Btn size="sm" variant="outline" onClick={() => navigate(`/book/${b._id}`)}>
                  View
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
