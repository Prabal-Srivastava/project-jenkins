from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.decorators import get_active_subscription, count_user_listings, require_plan_feature, session_required, get_current_user_id
from app.extensions import mongo
from app.models import BookCreateBody, BookUpdateBody, MarketValueQuery, PlaceBidBody, ValuationBody
from app.utils import (
    calculate_depreciation,
    calculate_market_value,
    get_book_valuation,
    location_nearby_query,
    tenant_query,
    utcnow,
)

bp = Blueprint("books", __name__, url_prefix="/api/books")


def _require_tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required (JWT claim or X-Tenant-Id)"}), 401)
    return tid, None


def _serialize_book(doc: dict) -> dict:
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    if doc.get("seller_id"):
        doc["seller_id"] = str(doc["seller_id"])
    if doc.get("highest_bidder_id"):
        doc["highest_bidder_id"] = str(doc["highest_bidder_id"])
    if doc.get("locked_for_buyer"):
        doc["locked_for_buyer"] = str(doc["locked_for_buyer"])
    if doc.get("pending_order_id"):
        doc["pending_order_id"] = str(doc["pending_order_id"])
    return doc


@bp.get("")
def list_books():
    tid, err = _require_tenant()
    if err:
        return err
    q = tenant_query(tid, {"status": "available"})
    course = request.args.get("course_code")
    semester = request.args.get("semester")
    isbn = request.args.get("isbn")
    author = request.args.get("author")
    if course:
        q["course_code"] = course
    if semester:
        q["semester"] = semester
    if isbn:
        q["isbn"] = isbn
    if author:
        q["author"] = {"$regex": author, "$options": "i"}
    cur = mongo.db.books.find(q).limit(100)
    return jsonify([_serialize_book(d) for d in cur])


@bp.get("/search")
def search_books():
    tid, err = _require_tenant()
    if err:
        return err
    qtext = (request.args.get("q") or "").strip()
    if not qtext:
        return jsonify([])
    cur = mongo.db.books.find(
        {"$text": {"$search": qtext}, "tenant_id": tid, "status": "available"},
        {"score": {"$meta": "textScore"}},
    ).sort([("score", {"$meta": "textScore"})]).limit(50)
    return jsonify([_serialize_book(d) for d in cur])


@bp.get("/nearby")
def nearby_books():
    tid, err = _require_tenant()
    if err:
        return err
    city = request.args.get("city")
    university = request.args.get("university")
    if not city and not university:
        return jsonify({"error": "Provide city or university"}), 400
    q = location_nearby_query(tid, city, university)
    cur = mongo.db.books.find(q).limit(50)
    return jsonify([_serialize_book(d) for d in cur])


@bp.get("/<book_id>")
def get_book(book_id):
    tid, err = _require_tenant()
    if err:
        return err
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    doc = mongo.db.books.find_one({"_id": oid, "tenant_id": tid})
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify(_serialize_book(doc))


@bp.post("")
@session_required
def create_book():
    tid, err = _require_tenant()
    if err:
        return err
    try:
        body = BookCreateBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    seller_id = get_current_user_id()
    sub = get_active_subscription(seller_id, tid)
    if not sub:
        return jsonify({"error": "Subscription required"}), 403
    max_listings = (sub.get("features") or {}).get("max_listings", 10)
    if count_user_listings(seller_id, tid) >= max_listings:
        return jsonify({"error": "Listing limit reached for your plan"}), 403

    if body.sale_type in ("auction", "both"):
        plan_feature = (sub.get("features") or {}).get("can_bid")
        if not plan_feature:
            return jsonify({"error": "Upgrade plan to list auctions"}), 403

    doc = body.model_dump()
    doc["tenant_id"] = tid
    doc["seller_id"] = ObjectId(seller_id)
    doc["created_at"] = utcnow()
    doc["current_highest_bid"] = float(body.min_bid or 0)
    doc["highest_bidder_id"] = None
    if body.original_retail_price is not None and body.publication_year_claimed is not None:
        age_years = max(0.0, float(datetime.utcnow().year - body.publication_year_claimed))
        doc["pricing_hint"] = calculate_depreciation(
            body.original_retail_price,
            body.condition_report.rating,
            age_years,
        )
    res = mongo.db.books.insert_one(doc)
    return jsonify({"id": str(res.inserted_id)}), 201


@bp.patch("/<book_id>")
@session_required
def update_book(book_id):
    tid, err = _require_tenant()
    if err:
        return err
    try:
        body = BookUpdateBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    seller = get_current_user_id()
    book = mongo.db.books.find_one({"_id": oid, "tenant_id": tid})
    if not book:
        return jsonify({"error": "Not found"}), 404
    if str(book.get("seller_id")) != seller:
        return jsonify({"error": "Forbidden"}), 403
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if patch:
        patch["updated_at"] = utcnow()
        mongo.db.books.update_one({"_id": oid}, {"$set": patch})
    return jsonify({"ok": True})


@bp.delete("/<book_id>")
@session_required
def delete_book(book_id):
    """Delete a book. Sellers can delete their own books, admins can delete any book."""
    tid, err = _require_tenant()
    if err:
        return err
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    
    user_id = get_current_user_id()
    book = mongo.db.books.find_one({"_id": oid, "tenant_id": tid})
    
    if not book:
        return jsonify({"error": "Not found"}), 404
    
    # Check if user is the seller or an admin
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    is_owner = str(book.get("seller_id")) == user_id
    is_admin = user and user.get("role") == "super_admin"
    
    if not (is_owner or is_admin):
        return jsonify({"error": "Forbidden"}), 403
    
    # Check if book has active orders
    active_order = mongo.db.orders.find_one({
        "book_id": oid,
        "status": {"$in": ["pending_payment", "paid_held", "shipped"]}
    })
    
    if active_order:
        return jsonify({"error": "Cannot delete book with active orders"}), 400
    
    # Delete the book
    mongo.db.books.delete_one({"_id": oid})
    
    # Clean up related data
    mongo.db.offers.delete_many({"book_id": oid})
    mongo.db.bids.delete_many({"book_id": oid})
    
    return jsonify({"ok": True, "message": "Book deleted successfully"})


@bp.post("/<book_id>/bids")
@require_plan_feature("can_bid")
def place_bid(book_id):
    tid, err = _require_tenant()
    if err:
        return err
    try:
        body = PlaceBidBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    buyer = get_current_user_id()
    book = mongo.db.books.find_one({"_id": oid, "tenant_id": tid})
    if not book or book.get("status") != "available":
        return jsonify({"error": "Book not available for bidding"}), 400
    if str(book.get("seller_id")) == buyer:
        return jsonify({"error": "Cannot bid on your own listing"}), 400
    if book.get("sale_type") not in ("auction", "both"):
        return jsonify({"error": "Not an auction listing"}), 400
    end = book.get("auction_end")
    if end and end < utcnow():
        return jsonify({"error": "Auction ended"}), 400
    inc = float(book.get("bid_increment") or 1.0)
    current = float(book.get("current_highest_bid") or book.get("min_bid") or 0)
    if body.amount < current + inc:
        return jsonify({"error": f"Bid must be at least {current + inc}"}), 400

    mongo.db.books.update_one(
        {"_id": oid},
        {"$set": {"current_highest_bid": body.amount, "highest_bidder_id": ObjectId(buyer)}},
    )
    mongo.db.bids.insert_one(
        {
            "tenant_id": tid,
            "book_id": oid,
            "buyer_id": ObjectId(buyer),
            "amount": body.amount,
            "created_at": utcnow(),
        }
    )
    return jsonify({"ok": True, "current_highest_bid": body.amount})


@bp.get("/<book_id>/bids")
def list_bids(book_id):
    tid, err = _require_tenant()
    if err:
        return err
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    cur = mongo.db.bids.find({"book_id": oid, "tenant_id": tid}).sort("created_at", -1).limit(50)
    out = []
    for b in cur:
        b["_id"] = str(b["_id"])
        b["book_id"] = str(b["book_id"])
        b["buyer_id"] = str(b["buyer_id"])
        out.append(b)
    return jsonify(out)


@bp.post("/valuation")
def valuation():
    try:
        body = ValuationBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    price = get_book_valuation(body.original_price, body.condition_score, body.age_years)
    breakdown = calculate_depreciation(body.original_price, body.condition_score, body.age_years)
    return jsonify({"suggested_price": round(price, 2), "breakdown": breakdown})


@bp.get("/market-value")
def market_value():
    tid, err = _require_tenant()
    if err:
        return err
    try:
        q = MarketValueQuery.model_validate({"isbn": request.args.get("isbn", "")})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    result = calculate_market_value(mongo.db, q.isbn, tid)
    return jsonify(result)
