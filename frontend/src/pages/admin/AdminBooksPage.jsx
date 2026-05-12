import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Btn, Card, Input, SkeletonTable, ErrorMessage, toast } from "../../components/ui";
import { apiJson } from "../../lib/api";

export default function AdminBooksPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-books", statusFilter, searchQuery],
    queryFn: () => {
      let url = "/api/admin-panel/books?limit=200";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      return apiJson(url);
    },
    retry: false,
  });

  const deleteBook = useMutation({
    mutationFn: (bookId) => apiJson(`/api/books/${bookId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-books"] });
      toast.success("Book deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete book");
    },
  });

  if (isLoading) return <SkeletonTable rows={10} cols={7} />;
  if (isError) return <ErrorMessage message={error?.message} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">📚 All Books</h2>
          <p className="text-sm text-slate-600 mt-1">
            Total: {data?.total || 0} books
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-950"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          type="search"
          placeholder="Search by title, ISBN, author, or seller email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </Card>

      {/* Books Table */}
      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Book Details</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listed</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.books?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No books found
                </td>
              </tr>
            ) : (
              data?.books?.map((book) => (
                <tr
                  key={book._id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="font-semibold text-slate-900 truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {book.author && `by ${book.author}`}
                      </p>
                      {book.isbn && (
                        <p className="text-xs text-slate-400 font-mono">
                          ISBN: {book.isbn}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-slate-900 font-medium">
                        {book.seller_email || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {book.seller_role || "seller"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {book.city || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">
                      ₹{typeof book.price === "number" ? book.price.toFixed(2) : book.price}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {book.condition_grade || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        book.status === "available"
                          ? "success"
                          : book.status === "sold"
                          ? "secondary"
                          : "warning"
                      }
                    >
                      {book.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-500">
                      {book.created_at
                        ? new Date(book.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Btn
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/book/${book._id}`)}
                        title="View details"
                      >
                        👁️
                      </Btn>
                      <Btn
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${book.title}" by ${book.seller_email}?`
                            )
                          ) {
                            deleteBook.mutate(book._id);
                          }
                        }}
                        disabled={deleteBook.isPending}
                        title="Delete book"
                      >
                        🗑️
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data?.books?.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {data.books.length} of {data.total} books
          </div>
        )}
      </Card>
    </div>
  );
}
