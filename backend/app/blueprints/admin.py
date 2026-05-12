"""Platform administration (super_admin only)."""
from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request
from app.decorators import get_current_user_id
from pydantic import BaseModel, ValidationError
from typing import Literal

from app.decorators import require_roles
from app.extensions import mongo
from app.models import AdminUserRolePatch, DEFAULT_PLANS
from app.utils import utcnow

bp = Blueprint("admin", __name__, url_prefix="/api/admin-panel")


def _serialize_user(doc: dict) -> dict:
    out = {
        "_id":            str(doc["_id"]),
        "email":          doc.get("email"),
        "role":           doc.get("role"),
        "tenant_id":      doc.get("tenant_id"),
        "email_verified": doc.get("email_verified", False),
        "approved":       doc.get("approved", True),
        "blocked":        doc.get("blocked", False),
        "avg_rating":     doc.get("avg_rating"),
        "review_count":   doc.get("review_count", 0),
    }
    c = doc.get("created_at")
    out["created_at"] = c.isoformat() + "Z" if c else None
    return out


class UserActionBody(BaseModel):
    action: Literal["approve", "block", "unblock"]


# ── Overview ────────────────────────────────────────────────
@bp.get("/overview")
@require_roles("super_admin")
def overview():
    db = mongo.db
    return jsonify({
        "counts": {
            "users":          db.users.count_documents({}),
            "books":          db.books.count_documents({}),
            "orders":         db.orders.count_documents({}),
            "transactions":   db.transactions.count_documents({}),
            "tenants":        db.tenants.count_documents({}),
            "offers_pending": db.offers.count_documents({"status": "pending"}),
            "conversations":  db.conversations.count_documents({}),
            "open_tickets":   db.tickets.count_documents({"status": "open"}),
            "pending_approvals": db.users.count_documents({
                "approved": False,
                "role": {"$in": ["individual_seller", "store_owner"]},
            }),
        }
    })


# ── Users ────────────────────────────────────────────────────
@bp.get("/users")
@require_roles("super_admin")
def list_users():
    try:
        skip  = max(0, int(request.args.get("skip", 0)))
        limit = min(200, max(1, int(request.args.get("limit", 50))))
    except ValueError:
        return jsonify({"error": "Invalid skip/limit"}), 400
    role_filter = request.args.get("role")
    q: dict = {}
    if role_filter:
        q["role"] = role_filter
    cur = (
        mongo.db.users
        .find(q, {"password_hash": 0, "verification_token": 0, "reset_token": 0})
        .sort("created_at", -1).skip(skip).limit(limit)
    )
    total = mongo.db.users.count_documents(q)
    return jsonify({"total": total, "users": [_serialize_user(u) for u in cur]})


@bp.patch("/users/<user_id>")
@require_roles("super_admin")
def patch_user(user_id):
    try:
        body = AdminUserRolePatch.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({"error": "Invalid user id"}), 400

    if str(get_current_user_id()) == user_id and body.role != "super_admin":
        return jsonify({"error": "Cannot demote yourself from super_admin"}), 400

    res = mongo.db.users.update_one({"_id": oid}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    if body.role == "super_admin":
        u   = mongo.db.users.find_one({"_id": oid})
        tid = (u or {}).get("tenant_id", "default")
        plan = DEFAULT_PLANS["enterprise"]
        now  = utcnow()
        mongo.db.subscriptions.update_one(
            {"user_id": oid, "tenant_id": tid},
            {"$set": {"plan_type": "enterprise", "features": plan["features"],
                      "status": "active", "updated_at": now},
             "$setOnInsert": {"user_id": oid, "tenant_id": tid, "created_at": now}},
            upsert=True,
        )
    return jsonify({"ok": True, "role": body.role})


@bp.post("/users/<user_id>/action")
@require_roles("super_admin")
def user_action(user_id):
    """Approve / block / unblock a seller or store owner."""
    try:
        body = UserActionBody.model_validate(request.get_json(force=True, silent=True) or {})
        oid  = ObjectId(user_id)
    except (ValidationError, InvalidId) as e:
        return jsonify({"error": str(e)}), 400

    if body.action == "approve":
        upd = {"$set": {"approved": True, "approved_at": utcnow()}}
    elif body.action == "block":
        upd = {"$set": {"blocked": True, "blocked_at": utcnow()}}
    else:
        upd = {"$set": {"blocked": False}, "$unset": {"blocked_at": ""}}

    res = mongo.db.users.update_one({"_id": oid}, upd)
    if res.matched_count == 0:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"ok": True, "action": body.action})


@bp.delete("/users/<user_id>")
@require_roles("super_admin")
def delete_user(user_id):
    """Delete a user and all their associated data."""
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({"error": "Invalid user id"}), 400

    # Prevent deleting yourself
    if str(get_current_user_id()) == user_id:
        return jsonify({"error": "Cannot delete yourself"}), 400

    # Check if user exists
    user = mongo.db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Delete user's books
    mongo.db.books.delete_many({"seller_id": oid})
    
    # Delete user's offers
    mongo.db.offers.delete_many({"$or": [{"buyer_id": oid}, {"seller_id": oid}]})
    
    # Delete user's conversations
    mongo.db.conversations.delete_many({"$or": [{"buyer_id": oid}, {"seller_id": oid}]})
    
    # Delete user's orders
    mongo.db.orders.delete_many({"$or": [{"buyer_id": oid}, {"seller_id": oid}]})
    
    # Delete user's reviews
    mongo.db.reviews.delete_many({"$or": [{"reviewer_id": oid}, {"reviewee_id": oid}]})
    
    # Delete user's subscriptions
    mongo.db.subscriptions.delete_many({"user_id": oid})
    
    # Delete user's transactions
    mongo.db.transactions.delete_many({"user_id": oid})
    
    # Finally delete the user
    mongo.db.users.delete_one({"_id": oid})
    
    return jsonify({"ok": True, "message": "User and all associated data deleted successfully"})


# ── Books (admin view) ─────────────────────────────────────
@bp.get("/books")
@require_roles("super_admin")
def list_books():
    """View all books with seller information."""
    try:
        skip = max(0, int(request.args.get("skip", 0)))
        limit = min(200, max(1, int(request.args.get("limit", 50))))
    except ValueError:
        return jsonify({"error": "Invalid skip/limit"}), 400
    
    status_filter = request.args.get("status")
    search_query = request.args.get("search")
    
    q: dict = {}
    if status_filter:
        q["status"] = status_filter
    if search_query:
        q["$or"] = [
            {"title": {"$regex": search_query, "$options": "i"}},
            {"isbn": {"$regex": search_query, "$options": "i"}},
            {"author": {"$regex": search_query, "$options": "i"}},
        ]
    
    # Get books with seller info
    pipeline = [
        {"$match": q},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "seller_id",
            "foreignField": "_id",
            "as": "seller"
        }},
        {"$unwind": {"path": "$seller", "preserveNullAndEmptyArrays": True}},
    ]
    
    books = []
    for b in mongo.db.books.aggregate(pipeline):
        b["_id"] = str(b["_id"])
        b["seller_id"] = str(b["seller_id"])
        b["seller_email"] = b.get("seller", {}).get("email", "Unknown")
        b["seller_role"] = b.get("seller", {}).get("role", "seller")
        if "seller" in b:
            del b["seller"]
        books.append(b)
    
    total = mongo.db.books.count_documents(q)
    return jsonify({"total": total, "books": books})


# ── Commissions ──────────────────────────────────────────────
@bp.get("/commissions")
@require_roles("super_admin")
def commissions():
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$lookup": {"from": "orders", "localField": "order_id",
                     "foreignField": "_id", "as": "order"}},
        {"$unwind": {"path": "$order", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$order.seller_id",
            "total_sales": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"total_sales": -1}},
        {"$limit": 50},
    ]
    rows = []
    for r in mongo.db.transactions.aggregate(pipeline):
        rows.append({
            "seller_id":   str(r["_id"]) if r["_id"] else None,
            "total_sales": round(r["total_sales"], 2),
            "count":       r["count"],
            "platform_fee": round(r["total_sales"] * 0.05, 2),
        })
    return jsonify(rows)


# ── Tickets (admin view) ─────────────────────────────────────
@bp.get("/tickets")
@require_roles("super_admin")
def list_tickets():
    status = request.args.get("status")
    q: dict = {}
    if status:
        q["status"] = status
    cur = mongo.db.tickets.find(q).sort("created_at", -1).limit(200)
    out = []
    for t in cur:
        t["_id"]       = str(t["_id"])
        t["order_id"]  = str(t["order_id"])
        t["buyer_id"]  = str(t["buyer_id"])
        t["seller_id"] = str(t["seller_id"])
        out.append(t)
    return jsonify(out)
