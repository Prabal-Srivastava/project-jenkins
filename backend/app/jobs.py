"""Background jobs: offer expiry and auction resolution."""

from __future__ import annotations

from app.extensions import mongo
from app.utils import utcnow


def register_jobs(scheduler, app):
    if not app.config.get("SCHEDULER_ENABLED", True):
        return

    @scheduler.task("interval", id="expire_offers", hours=1, misfire_grace_time=300)
    def expire_stagnant_offers():
        with app.app_context():
            threshold = utcnow()
            mongo.db.offers.update_many(
                {"status": "pending", "expires_at": {"$lte": threshold}},
                {"$set": {"status": "expired", "resolved_at": threshold}},
            )

    @scheduler.task("interval", id="resolve_auctions", minutes=1, misfire_grace_time=60)
    def resolve_auctions():
        with app.app_context():
            now = utcnow()
            q = {
                "sale_type": {"$in": ["auction", "both"]},
                "status": "available",
                "auction_end": {"$lte": now},
                "current_highest_bid": {"$gt": 0},
                "highest_bidder_id": {"$exists": True},
                "pending_order_id": {"$exists": False},
            }
            for book in mongo.db.books.find(q):
                buyer_id = book["highest_bidder_id"]
                amount = float(book["current_highest_bid"])
                order = {
                    "tenant_id": book["tenant_id"],
                    "book_id": book["_id"],
                    "buyer_id": buyer_id,
                    "seller_id": book["seller_id"],
                    "amount": amount,
                    "status": "pending_payment",
                    "source": "auction",
                    "created_at": now,
                    "invoice_number": f"AUC-{str(book['_id'])[:8].upper()}",
                }
                ins = mongo.db.orders.insert_one(order)
                mongo.db.books.update_one(
                    {"_id": book["_id"]},
                    {
                        "$set": {
                            "status": "pending_payment",
                            "final_price": amount,
                            "locked_for_buyer": buyer_id,
                            "auction_resolved_at": now,
                            "pending_order_id": ins.inserted_id,
                        }
                    },
                )
