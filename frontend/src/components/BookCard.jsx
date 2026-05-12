import { useNavigate } from "react-router-dom";
import { Card, Badge, Btn } from "./ui";

const CONDITION_COLORS = {
  "New": "success",
  "Like New": "default",
  "Good": "secondary",
  "Fair": "warning",
  "Worn": "destructive",
};

function fmt(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export default function BookCard({ book }) {
  const navigate = useNavigate();
  const conditionVariant = CONDITION_COLORS[book.condition_grade] ?? "default";

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Cover Image */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {book.image_url ? (
          <img
            src={book.image_url}
            alt={book.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 p-4"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-300">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">No cover image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Badge variant={conditionVariant} className="shadow-sm">
            {book.condition_grade ?? "—"}
          </Badge>
          {book.sale_type === "auction" && (
            <Badge variant="warning" className="shadow-sm">
              🔨 Auction
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col p-4 space-y-3">
        <div className="flex-1 space-y-2">
          <h3 className="line-clamp-2 text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
            {book.title}
          </h3>
          
          {book.author && (
            <p className="text-sm text-slate-600 truncate flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {book.author}
            </p>
          )}
          
          {book.isbn && (
            <p className="text-xs text-slate-400 font-mono">ISBN: {book.isbn}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">₹{fmt(book.price)}</p>
            {book.city && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {book.city}
              </p>
            )}
          </div>
        </div>

        <Btn className="w-full" size="sm" onClick={() => navigate(`/book/${book._id}`)}>
          View Details
        </Btn>
      </div>
    </Card>
  );
}
