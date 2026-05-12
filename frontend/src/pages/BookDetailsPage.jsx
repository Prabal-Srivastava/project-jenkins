import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, Badge, Input, toast, ErrorMessage, Skeleton } from "../components/ui";
import { apiJson, apiHeaders } from "../lib/api";

async function fetchBook(bookId) {
  const res = await fetch(`/api/books/${bookId}`, {
    headers: apiHeaders(false),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [offerAmount, setOfferAmount] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    price: "",
    description: "",
    city: "",
    condition_grade: "",
  });

  const { data: book, isLoading, isError, error } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => fetchBook(bookId),
    retry: false,
    onSuccess: (data) => {
      setEditForm({
        title: data.title || "",
        author: data.author || "",
        price: data.price?.toString() || "",
        description: data.description || "",
        city: data.city || "",
        condition_grade: data.condition_grade || "",
      });
    },
  });

  const deleteBook = useMutation({
    mutationFn: () => apiJson(`/api/books/${bookId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Book deleted successfully");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete book");
    },
  });

  const updateBook = useMutation({
    mutationFn: (data) =>
      apiJson(`/api/books/${bookId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Book updated successfully");
      setShowEditForm(false);
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update book");
    },
  });

  const makeOffer = useMutation({
    mutationFn: (amount) =>
      apiJson("/api/offers", {
        method: "POST",
        body: JSON.stringify({ book_id: bookId, amount: parseFloat(amount) }),
      }),
    onSuccess: () => {
      toast.success("Offer sent successfully!");
      setOfferAmount("");
      setShowOfferForm(false);
      qc.invalidateQueries({ queryKey: ["book", bookId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to send offer");
    },
  });

  const createOrder = useMutation({
    mutationFn: () =>
      apiJson("/api/orders", {
        method: "POST",
        body: JSON.stringify({ book_id: bookId }),
      }),
    onSuccess: (data) => {
      toast.success("Order created! Redirecting to payment...");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create order");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-2xl px-4">
          <ErrorMessage message={error?.message || "Failed to load book"} />
          <Btn variant="outline" className="mt-4" onClick={() => navigate("/")}>
            ← Back to Catalog
          </Btn>
        </div>
      </div>
    );
  }

  const isOwner = user && book.seller_id === user._id;
  const isBuyer = user && book.seller_id !== user._id;
  const canDelete = isOwner || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Btn variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          ← Back
        </Btn>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Section */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-50 to-slate-100">
                {book.image_url ? (
                  <img
                    src={book.image_url}
                    alt={book.title}
                    className="h-full w-full object-contain p-8"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-32 w-32 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
            </Card>

            {/* Additional Info Card */}
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Book Information</h3>
              <div className="space-y-2 text-sm">
                {book.isbn && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ISBN:</span>
                    <span className="font-mono text-slate-900">{book.isbn}</span>
                  </div>
                )}
                {book.published_year && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Published:</span>
                    <span className="text-slate-900">{book.published_year}</span>
                  </div>
                )}
                {book.category && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Category:</span>
                    <span className="text-slate-900">{book.category}</span>
                  </div>
                )}
                {book.city && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Location:</span>
                    <span className="text-slate-900">{book.city}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Title and Badges */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant={book.status === "available" ? "success" : "secondary"}>
                  {book.status}
                </Badge>
                {book.condition_grade && (
                  <Badge variant="outline">{book.condition_grade}</Badge>
                )}
                {book.sale_type === "auction" && (
                  <Badge variant="warning">🔨 Auction</Badge>
                )}
                {book.sale_type === "negotiable" && (
                  <Badge variant="default">💬 Negotiable</Badge>
                )}
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                {book.title}
              </h1>

              {book.author && (
                <p className="text-lg text-slate-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {book.author}
                </p>
              )}
            </div>

            {/* Price */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900">
                  ₹{typeof book.price === "number" ? book.price.toFixed(2) : book.price}
                </span>
                {book.original_price && book.original_price > book.price && (
                  <span className="text-lg text-slate-500 line-through">
                    ₹{book.original_price.toFixed(2)}
                  </span>
                )}
              </div>
              {book.original_price && book.original_price > book.price && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  Save ₹{(book.original_price - book.price).toFixed(2)} (
                  {Math.round(((book.original_price - book.price) / book.original_price) * 100)}% off)
                </p>
              )}
            </Card>

            {/* Description */}
            {book.description && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {book.description}
                </p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!user && (
                <Btn className="w-full" size="lg" onClick={() => navigate("/login")}>
                  Sign in to Purchase
                </Btn>
              )}

              {isBuyer && book.status === "available" && (
                <>
                  {book.sale_type === "fixed" && (
                    <Btn
                      className="w-full"
                      size="lg"
                      onClick={() => createOrder.mutate()}
                      disabled={createOrder.isPending}
                    >
                      {createOrder.isPending ? "Processing..." : "Buy Now"}
                    </Btn>
                  )}

                  {(book.sale_type === "negotiable" || book.sale_type === "auction") && (
                    <>
                      {!showOfferForm ? (
                        <Btn
                          className="w-full"
                          size="lg"
                          variant="outline"
                          onClick={() => setShowOfferForm(true)}
                        >
                          💬 Make an Offer
                        </Btn>
                      ) : (
                        <Card className="p-4">
                          <h4 className="font-semibold text-slate-900 mb-3">Make an Offer</h4>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Enter amount"
                              value={offerAmount}
                              onChange={(e) => setOfferAmount(e.target.value)}
                              className="flex-1"
                            />
                            <Btn
                              onClick={() => makeOffer.mutate(offerAmount)}
                              disabled={!offerAmount || makeOffer.isPending}
                            >
                              {makeOffer.isPending ? "Sending..." : "Send"}
                            </Btn>
                            <Btn
                              variant="outline"
                              onClick={() => {
                                setShowOfferForm(false);
                                setOfferAmount("");
                              }}
                            >
                              Cancel
                            </Btn>
                          </div>
                        </Card>
                      )}
                    </>
                  )}

                  <Btn
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate(`/chat?book=${bookId}`)}
                  >
                    💬 Message Seller
                  </Btn>
                </>
              )}

              {isOwner && (
                <div className="space-y-2">
                  {!showEditForm ? (
                    <Btn
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowEditForm(true)}
                    >
                      ✏️ Edit Book
                    </Btn>
                  ) : (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-semibold text-slate-900">Edit Book Details</h4>
                      <Input
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                      <Input
                        placeholder="Author"
                        value={editForm.author}
                        onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      />
                      <Input
                        placeholder="City"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      />
                      <select
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={editForm.condition_grade}
                        onChange={(e) => setEditForm({ ...editForm, condition_grade: e.target.value })}
                      >
                        <option value="">Select Condition</option>
                        <option value="New">New</option>
                        <option value="Like New">Like New</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Worn">Worn</option>
                      </select>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                        rows={4}
                        placeholder="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Btn
                          onClick={() => {
                            const data = {
                              title: editForm.title,
                              author: editForm.author,
                              price: parseFloat(editForm.price),
                              description: editForm.description,
                              city: editForm.city,
                              condition_grade: editForm.condition_grade,
                            };
                            updateBook.mutate(data);
                          }}
                          disabled={updateBook.isPending}
                        >
                          {updateBook.isPending ? "Saving..." : "Save Changes"}
                        </Btn>
                        <Btn
                          variant="outline"
                          onClick={() => setShowEditForm(false)}
                        >
                          Cancel
                        </Btn>
                      </div>
                    </Card>
                  )}
                  <Btn
                    className="w-full"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this book?")) {
                        deleteBook.mutate();
                      }
                    }}
                    disabled={deleteBook.isPending}
                  >
                    {deleteBook.isPending ? "Deleting..." : "🗑️ Delete Book"}
                  </Btn>
                </div>
              )}

              {user?.role === "super_admin" && !isOwner && (
                <Btn
                  className="w-full"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Admin: Delete this book?")) {
                      deleteBook.mutate();
                    }
                  }}
                  disabled={deleteBook.isPending}
                >
                  {deleteBook.isPending ? "Deleting..." : "⚡ Admin Delete"}
                </Btn>
              )}
            </div>

            {/* Seller Info */}
            {book.seller_email && (
              <Card className="p-4 bg-slate-50">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Seller Information</h4>
                <p className="text-sm text-slate-600">{book.seller_email}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
