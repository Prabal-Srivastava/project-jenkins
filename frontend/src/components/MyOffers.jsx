import { ExpiryTimer } from "./ExpiryTimer";
import { Badge, Card, SectionTitle, Skeleton } from "./ui";

const STATUS_COLOR = { pending: "amber", accepted: "green", rejected: "red", countered: "blue", expired: "gray" };

export default function MyOffers({ data, isLoading }) {
  return (
    <Card className="p-5">
      <SectionTitle>🤝 My Offers (Buyer)</SectionTitle>
      {isLoading && <Skeleton className="h-20" />}
      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-primary-400 text-center py-4">No offers yet.</p>
      )}
      <ul className="space-y-2">
        {data?.map((o) => (
          <li key={o._id} className="rounded-xl bg-primary-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-primary-700">${o.offer_amount}</span>
              <Badge color={STATUS_COLOR[o.status] ?? "blue"}>{o.status}</Badge>
            </div>
            <p className="text-xs text-primary-400 mt-0.5 font-mono truncate">{o.book_id}</p>
            {o.expires_at && o.status === "pending" && (
              <div className="mt-1.5"><ExpiryTimer expiresAt={o.expires_at} /></div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
