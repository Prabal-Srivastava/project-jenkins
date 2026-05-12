import { Badge, Card, SectionTitle, Skeleton } from "./ui";

const STATUS_COLOR = {
  available:       "green",
  pending_payment: "amber",
  sold:            "gray",
  auction_pending: "blue",
};

export default function MyListings({ data, isLoading }) {
  return (
    <Card className="p-5">
      <SectionTitle>📚 My Listings</SectionTitle>
      {isLoading && <Skeleton className="h-20" />}
      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-primary-400 text-center py-4">No listings yet.</p>
      )}
      <ul className="space-y-2">
        {data?.map((b) => (
          <li key={b._id} className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary-900 truncate">{b.title}</p>
              {b.isbn && <p className="text-xs text-primary-400">ISBN {b.isbn}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-sm font-bold text-primary-600">${b.price}</span>
              <Badge color={STATUS_COLOR[b.status] ?? "blue"}>{b.status}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
