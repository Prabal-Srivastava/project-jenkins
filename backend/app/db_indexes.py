"""Create indexes once at startup (idempotent)."""

from __future__ import annotations

import logging

from pymongo.errors import OperationFailure

from app.extensions import mongo

_log = logging.getLogger(__name__)


def _ensure(label: str, fn) -> None:
    try:
        fn()
    except OperationFailure as e:
        _log.warning("MongoDB index step %r: %s (code=%s)", label, e, getattr(e, "code", None))


def ensure_indexes():
    db = mongo.db
    _ensure("tenants.slug", lambda: db.tenants.create_index("slug", unique=True))

    def books_indexes():
        db.books.create_index([("tenant_id", 1), ("status", 1), ("price", 1)])
        db.books.create_index([("tenant_id", 1), ("city", 1)])
        db.books.create_index([("tenant_id", 1), ("university", 1)])
        db.books.create_index([("tenant_id", 1), ("course_code", 1)])
        db.books.create_index([("tenant_id", 1), ("isbn", 1)])
        db.books.create_index([("tenant_id", 1), ("auction_end", 1), ("status", 1)])
        db.books.create_index([("title", "text"), ("author", "text"), ("isbn", "text")])

    _ensure("books", books_indexes)

    def offers_indexes():
        db.offers.create_index([("tenant_id", 1), ("book_id", 1), ("status", 1)])
        db.offers.create_index([("buyer_id", 1), ("created_at", -1)])

    _ensure("offers", offers_indexes)

    def orders_indexes():
        db.orders.create_index([("tenant_id", 1), ("buyer_id", 1)])
        db.orders.create_index([("tenant_id", 1), ("seller_id", 1)])
        db.orders.create_index([("tenant_id", 1), ("status", 1)])

    _ensure("orders", orders_indexes)
    _ensure(
        "conversations",
        lambda: db.conversations.create_index([("tenant_id", 1), ("participants", 1)]),
    )
    _ensure(
        "messages",
        lambda: db.messages.create_index([("conversation_id", 1), ("created_at", 1)]),
    )
    _ensure(
        "transactions",
        lambda: db.transactions.create_index([("tenant_id", 1), ("isbn", 1), ("created_at", -1)]),
    )
    _ensure(
        "bids",
        lambda: db.bids.create_index([("tenant_id", 1), ("book_id", 1), ("created_at", -1)]),
    )
    _ensure(
        "subscriptions",
        lambda: db.subscriptions.create_index([("user_id", 1), ("tenant_id", 1), ("status", 1)]),
    )
    _ensure(
        "tickets",
        lambda: db.tickets.create_index([("tenant_id", 1), ("status", 1), ("created_at", -1)]),
    )
    _ensure(
        "reviews",
        lambda: db.reviews.create_index([("seller_id", 1), ("tenant_id", 1)]),
    )
    _ensure(
        "categories",
        lambda: db.categories.create_index("slug", unique=True),
    )
    
    def sessions_indexes():
        db.sessions.create_index("session_id", unique=True)
        db.sessions.create_index([("user_id", 1), ("tenant_id", 1)])
        db.sessions.create_index("expires_at", expireAfterSeconds=0)  # TTL index for auto-cleanup
    
    _ensure("sessions", sessions_indexes)
