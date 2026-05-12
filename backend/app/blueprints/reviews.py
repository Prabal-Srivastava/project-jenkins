"""ReviewModeration — buyers rate book condition accuracy + seller after delivery."""
from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import BaseModel, Field, ValidationError

from app.extensions import mongo
from app.utils import utcnow

bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


class ReviewCreateBody(BaseModel):
    order_id: str
    condition_accuracy: int = Field(ge=1, le=5, description="Did condition match description?")
    seller_rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


@bp.post("")
@session_required
def create_review():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = ReviewCreateBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    uid = get_current_user_id()
    try:
        oid = ObjectId(body.order_id)
    except InvalidId:
        return jsonify({"error": "Invalid order_id"}), 400

    order = mongo.db.orders.find_one({"_id": oid, "tenant_id": tid, "buyer_id": ObjectId(uid)})
    if not order:
        return jsonify({"error": "Order not found or not yours"}), 404
    if order.get("status") != "delivered":
        return jsonify({"error": "Can only review after delivery is confirmed"}), 400
    if mongo.db.reviews.find_one({"order_id": oid, "buyer_id": ObjectId(uid)}):
        return jsonify({"error": "Already reviewed"}), 409

    doc = {
        "tenant_id": tid,
        "order_id": oid,
        "book_id": order["book_id"],
        "buyer_id": ObjectId(uid),
        "seller_id": order["seller_id"],
        "condition_accuracy": body.condition_accuracy,
        "seller_rating": body.seller_rating,
        "comment": body.comment,
        "created_at": utcnow(),
    }
    ins = mongo.db.reviews.insert_one(doc)

    # Update seller aggregate rating
    pipeline = [
        {"$match": {"seller_id": order["seller_id"]}},
        {"$group": {"_id": None, "avg": {"$avg": "$seller_rating"}, "count": {"$sum": 1}}},
    ]
    agg = list(mongo.db.reviews.aggregate(pipeline))
    if agg:
        mongo.db.users.update_one(
            {"_id": order["seller_id"]},
            {"$set": {"avg_rating": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}},
        )

    return jsonify({"id": str(ins.inserted_id)}), 201


@bp.get("/book/<book_id>")
def book_reviews(book_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    cur = mongo.db.reviews.find({"book_id": oid, "tenant_id": tid}).sort("created_at", -1).limit(50)
    out = []
    for r in cur:
        r["_id"]       = str(r["_id"])
        r["order_id"]  = str(r["order_id"])
        r["book_id"]   = str(r["book_id"])
        r["buyer_id"]  = str(r["buyer_id"])
        r["seller_id"] = str(r["seller_id"])
        out.append(r)
    return jsonify(out)


@bp.get("/seller/<seller_id>")
def seller_reviews(seller_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        oid = ObjectId(seller_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    cur = mongo.db.reviews.find({"seller_id": oid, "tenant_id": tid}).sort("created_at", -1).limit(50)
    out = []
    for r in cur:
        r["_id"]       = str(r["_id"])
        r["order_id"]  = str(r["order_id"])
        r["book_id"]   = str(r["book_id"])
        r["buyer_id"]  = str(r["buyer_id"])
        r["seller_id"] = str(r["seller_id"])
        out.append(r)
    return jsonify(out)
