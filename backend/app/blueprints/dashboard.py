from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import ValidationError

from app.extensions import mongo
from app.models import WishlistAddBody
from app.utils import tenant_query

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


def _serialize_book(doc: dict) -> dict:
    d = dict(doc)
    d["_id"] = str(d["_id"])
    if d.get("seller_id"):
        d["seller_id"] = str(d["seller_id"])
    return d


@bp.get("/my-listings")
@session_required
def my_listings():
    tid, err = _tenant()
    if err:
        return err
    uid = get_current_user_id()
    q = tenant_query(tid, {"seller_id": ObjectId(uid)})
    cur = mongo.db.books.find(q).sort("created_at", -1).limit(200)
    return jsonify([_serialize_book(b) for b in cur])


@bp.get("/my-orders")
@session_required
def my_orders_summary():
    """Thin alias: buyer + seller order counts."""
    tid, err = _tenant()
    if err:
        return err
    uid = ObjectId(get_current_user_id())
    buying = mongo.db.orders.count_documents({"tenant_id": tid, "buyer_id": uid})
    selling = mongo.db.orders.count_documents({"tenant_id": tid, "seller_id": uid})
    return jsonify({"buying": buying, "selling": selling})


@bp.get("/wishlist")
@session_required
def wishlist_get():
    tid, err = _tenant()
    if err:
        return err
    uid = get_current_user_id()
    cur = mongo.db.wishlists.find({"tenant_id": tid, "user_id": ObjectId(uid)})
    ids = [w["book_id"] for w in cur]
    if not ids:
        return jsonify([])
    books = mongo.db.books.find({"_id": {"$in": ids}, "tenant_id": tid})
    return jsonify([_serialize_book(b) for b in books])


@bp.post("/wishlist")
@session_required
def wishlist_add():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = WishlistAddBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        boid = ObjectId(body.book_id)
    except InvalidId:
        return jsonify({"error": "Invalid book id"}), 400
    uid = get_current_user_id()
    book = mongo.db.books.find_one({"_id": boid, "tenant_id": tid})
    if not book:
        return jsonify({"error": "Book not found"}), 404
    mongo.db.wishlists.update_one(
        {"tenant_id": tid, "user_id": ObjectId(uid), "book_id": boid},
        {"$setOnInsert": {"tenant_id": tid, "user_id": ObjectId(uid), "book_id": boid}},
        upsert=True,
    )
    return jsonify({"ok": True})


@bp.delete("/wishlist/<book_id>")
@session_required
def wishlist_remove(book_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        boid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    mongo.db.wishlists.delete_one({"tenant_id": tid, "user_id": ObjectId(uid), "book_id": boid})
    return jsonify({"ok": True})
