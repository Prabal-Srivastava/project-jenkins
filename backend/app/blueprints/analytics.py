"""Analytics Hub — platform-wide stats for super_admin."""
from __future__ import annotations

from flask import Blueprint, g, jsonify
from app.decorators import require_roles
from app.extensions import mongo
from app.utils import utcnow
from datetime import timedelta

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _tenant():
    from flask import g
    return getattr(g, "tenant_id", None)


@bp.get("/summary")
@require_roles("super_admin")
def summary():
    tid = _tenant()
    db  = mongo.db
    now = utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Revenue this month
    rev_pipeline = [
        {"$match": {"tenant_id": tid, "status": "completed", "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    rev = list(db.transactions.aggregate(rev_pipeline))
    revenue_month = rev[0]["total"] if rev else 0
    sales_month   = rev[0]["count"] if rev else 0

    # Top 5 categories by listing count
    cat_pipeline = [
        {"$match": {"tenant_id": tid}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_categories = [{"category": r["_id"] or "Uncategorized", "count": r["count"]}
                      for r in db.books.aggregate(cat_pipeline)]

    # Condition distribution
    cond_pipeline = [
        {"$match": {"tenant_id": tid}},
        {"$group": {"_id": "$condition_grade", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    condition_dist = [{"grade": r["_id"], "count": r["count"]}
                      for r in db.books.aggregate(cond_pipeline)]

    # Seller approval pending
    pending_sellers = db.users.count_documents({"tenant_id": tid, "approved": False,
                                                "role": {"$in": ["individual_seller", "store_owner"]}})

    return jsonify({
        "revenue_this_month": round(revenue_month, 2),
        "sales_this_month": sales_month,
        "total_users": db.users.count_documents({"tenant_id": tid}),
        "active_listings": db.books.count_documents({"tenant_id": tid, "status": "available"}),
        "pending_seller_approvals": pending_sellers,
        "top_categories": top_categories,
        "condition_distribution": condition_dist,
        "open_tickets": db.tickets.count_documents({"tenant_id": tid, "status": "open"}),
    })


@bp.get("/revenue-trend")
@require_roles("super_admin")
def revenue_trend():
    tid = _tenant()
    now = utcnow()
    pipeline = [
        {"$match": {"tenant_id": tid, "status": "completed",
                    "created_at": {"$gte": now - timedelta(days=30)}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    return jsonify(list(mongo.db.transactions.aggregate(pipeline)))
