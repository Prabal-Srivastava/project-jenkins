import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import BookCard from "../components/BookCard";
import { Btn, Input, Card, Skeleton } from "../components/ui";
import { apiHeaders } from "../lib/api";
import { TENANT_ID } from "../lib/tenant";

async function fetchBooks(q) {
  const path = q.trim()
    ? `/api/books/search?q=${encodeURIComponent(q.trim())}`
    : "/api/books";
  const res = await fetch(path, { headers: apiHeaders(false), credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.map((b) => ({ ...b, price: typeof b.price === "number" ? b.price : Number(b.price) }));
}

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const query = useQuery({ queryKey: ["books", TENANT_ID, q], queryFn: () => fetchBooks(q) });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            
            {/* Content */}
            <div className="animate-fade-up space-y-6">
              <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                <span className="mr-2">📚</span>
                Used Book Marketplace
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Find your next
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">textbook for less</span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                Browse hundreds of used books from students near you. Fixed prices, auctions, and offers — all in one place.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="search"
                  placeholder="Search by title, author, or ISBN..."
                  className="pl-11 h-12 text-base shadow-lg"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                {[
                  { icon: "📖", value: "1000+", label: "Books listed" },
                  { icon: "🎓", value: "50+", label: "Universities" },
                  { icon: "💸", value: "Free", label: "To browse" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-sm text-slate-600">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-full bg-blue-200 opacity-30 blur-3xl" />
                <svg viewBox="0 0 320 320" className="relative drop-shadow-2xl" fill="none">
                  <rect x="60" y="180" width="200" height="28" rx="8" fill="#2563eb" opacity=".95"/>
                  <rect x="75" y="154" width="170" height="28" rx="8" fill="#3b82f6" opacity=".9"/>
                  <rect x="90" y="128" width="140" height="28" rx="8" fill="#60a5fa" opacity=".85"/>
                  <rect x="105" y="102" width="110" height="28" rx="8" fill="#93c5fd" opacity=".8"/>
                  <rect x="120" y="76" width="80" height="28" rx="8" fill="#bfdbfe" opacity=".75"/>
                  <circle cx="250" cy="70" r="6" fill="#38bdf8" opacity=".9"/>
                  <circle cx="70" cy="90" r="4" fill="#2563eb" opacity=".7"/>
                  <circle cx="270" cy="160" r="5" fill="#60a5fa" opacity=".8"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Books Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {q ? `Results for "${q}"` : "All Listings"}
            </h2>
            {query.data && (
              <p className="mt-1 text-sm text-slate-600">{query.data.length} books available</p>
            )}
          </div>
        </div>

        {query.isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {query.isError && (
          <Card className="p-8 text-center border-red-200 bg-red-50">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load books</h3>
            <p className="text-sm text-red-600">Please check if the backend is running and try again.</p>
          </Card>
        )}

        {query.data?.length === 0 && (
          <Card className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-3xl">📭</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No books found</h3>
            <p className="text-sm text-slate-600 mb-4">Try adjusting your search or browse all listings</p>
            {q && (
              <Btn variant="outline" onClick={() => setQ("")}>
                Clear search
              </Btn>
            )}
          </Card>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {query.data?.map((book, i) => (
            <div
              key={book._id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
            >
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
