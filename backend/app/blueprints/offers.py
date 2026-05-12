from __future__ import annotations

from datetime import datetime, timedelta

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import ValidationError

from app.decorators import count_buyer_offers_this_month, get_active_subscription, require_plan_feature
from app.extensions import mongo
from app.models import CounterOfferBody, SubmitOfferBody
from app.utils import utcnow

bp = Blueprint("offers", __name__, url_prefix="/api/offers")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


@bp.post("")
@require_plan_feature("can_make_offers")
def submit_offer():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = SubmitOfferBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    buyer_id = get_current_user_id()
    sub = get_active_subscription(buyer_id, tid)
    if not sub:
        return jsonify({"error": "No subscription"}), 403
    plan = sub.get("plan_type", "basic")
    max_offers = (sub.get("features") or {}).get("offers_per_month", 3)
    if count_buyer_offers_this_month(buyer_id, tid) >= max_offers:
        return jsonify({"error": "Monthly offer limit reached"}), 403

    try:
        book_oid = ObjectId(body.book_id)
    except InvalidId:
        return jsonify({"error": "Invalid book id"}), 400

    book = mongo.db.books.find_one({"_id": book_oid, "tenant_id": tid})
    if not book or book.get("status") != "available":
        return jsonify({"error": "Book not available"}), 400
    if not book.get("allow_offers"):
        return jsonify({"error": "Seller does not accept offers"}), 400
    if str(book.get("seller_id")) == buyer_id:
        return jsonify({"error": "Cannot offer on your own book"}), 400

    from flask import current_app

    hours = (
        current_app.config["OFFER_EXPIRE_HOURS_PRO"]
        if plan in ("pro", "enterprise")
        else current_app.config["OFFER_EXPIRE_HOURS_BASIC"]
    )
    expires = utcnow() + timedelta(hours=hours)

    doc = {
        "tenant_id": tid,
        "book_id": book_oid,
        "buyer_id": ObjectId(buyer_id),
        "seller_id": book["seller_id"],
        "offer_amount": body.offer_amount,
        "status": "pending",
        "created_at": utcnow(),
        "expires_at": expires,
    }
    ins = mongo.db.offers.insert_one(doc)
    return jsonify({"id": str(ins.inserted_id), "expires_at": expires.isoformat() + "Z"}), 201


@bp.post("/<offer_id>/accept")
@session_required
def accept_offer(offer_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        oid = ObjectId(offer_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    offer = mongo.db.offers.find_one({"_id": oid, "tenant_id": tid, "status": "pending"})
    if not offer:
        return jsonify({"error": "Offer not found or already processed"}), 404
    if str(offer["seller_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403

    mongo.db.offers.update_one(
        {"_id": oid},
        {"$set": {"status": "accepted", "resolved_at": utcnow()}},
    )
    mongo.db.books.update_one(
        {"_id": offer["book_id"]},
        {
            "$set": {
                "status": "pending_payment",
                "final_price": offer["offer_amount"],
                "locked_for_buyer": offer["buyer_id"],
            }
        },
    )
    mongo.db.offers.update_many(
        {
            "book_id": offer["book_id"],
            "status": "pending",
            "_id": {"$ne": oid},
        },
        {"$set": {"status": "rejected", "reason": "Another offer was accepted", "resolved_at": utcnow()}},
    )
    order = {
        "tenant_id": tid,
        "book_id": offer["book_id"],
        "buyer_id": offer["buyer_id"],
        "seller_id": offer["seller_id"],
        "amount": offer["offer_amount"],
        "status": "pending_payment",
        "source": "offer",
        "offer_id": oid,
        "created_at": utcnow(),
        "invoice_number": f"OFF-{str(oid)[:8].upper()}",
    }
    ins = mongo.db.orders.insert_one(order)
    return jsonify({"message": "Offer accepted", "order_id": str(ins.inserted_id)})


@bp.post("/<offer_id>/reject")
@session_required
def reject_offer(offer_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        oid = ObjectId(offer_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    offer = mongo.db.offers.find_one({"_id": oid, "tenant_id": tid, "status": "pending"})
    if not offer:
        return jsonify({"error": "Not found"}), 404
    if str(offer["seller_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403
    mongo.db.offers.update_one(
        {"_id": oid},
        {"$set": {"status": "rejected", "resolved_at": utcnow()}},
    )
    return jsonify({"message": "Offer rejected"})


@bp.post("/<offer_id>/counter")
@session_required
def counter_offer(offer_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        body = CounterOfferBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        oid = ObjectId(offer_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    offer = mongo.db.offers.find_one({"_id": oid, "tenant_id": tid, "status": "pending"})
    if not offer:
        return jsonify({"error": "Not found"}), 404
    if str(offer["seller_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403
    mongo.db.offers.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "countered",
                "offer_amount": body.counter_price,
                "last_action_by": "seller",
                "countered_at": utcnow(),
            }
        },
    )
    return jsonify({"message": "Counter-offer recorded"})


@bp.get("/mine")
@session_required
def my_offers():
    tid, err = _tenant()
    if err:
        return err
    uid = get_current_user_id()
    oid = ObjectId(uid)
    role = request.args.get("role", "buyer")
    q: dict = {"tenant_id": tid}
    if role == "seller":
        q["seller_id"] = oid
    else:
        q["buyer_id"] = oid
    cur = mongo.db.offers.find(q).sort("created_at", -1).limit(100)
    out = []
    for d in cur:
        d["_id"] = str(d["_id"])
        d["book_id"] = str(d["book_id"])
        d["buyer_id"] = str(d["buyer_id"])
        d["seller_id"] = str(d["seller_id"])
        out.append(d)
    return jsonify(out)
