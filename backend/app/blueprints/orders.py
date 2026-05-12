from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import ValidationError

from app.extensions import mongo
from app.models import CreateOrderBody, OrderShipBody
from app.utils import utcnow

bp = Blueprint("orders", __name__, url_prefix="/api/orders")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


def initiate_payout(order: dict) -> dict:
    """Stripe Connect payout placeholder — wire Connect account & transfers here."""
    return {"status": "simulated", "order_id": str(order.get("_id")), "amount": order.get("amount")}


def handle_refund_stub(order_id: ObjectId, reason: str) -> dict:
    return {"status": "simulated_refund", "order_id": str(order_id), "reason": reason}


@bp.post("")
@session_required
def create_order():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = CreateOrderBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    buyer = get_current_user_id()
    try:
        boid = ObjectId(body.book_id)
    except InvalidId:
        return jsonify({"error": "Invalid book"}), 400

    book = mongo.db.books.find_one({"_id": boid, "tenant_id": tid})
    if not book:
        return jsonify({"error": "Book not found"}), 404
    if str(book.get("seller_id")) == buyer:
        return jsonify({"error": "Cannot buy your own book"}), 400

    if book.get("status") == "pending_payment" and str(book.get("locked_for_buyer")) == buyer:
        existing = mongo.db.orders.find_one(
            {"book_id": boid, "buyer_id": ObjectId(buyer), "status": "pending_payment"}
        )
        if existing:
            return jsonify({"order_id": str(existing["_id"]), "existing": True})

    if book.get("status") != "available":
        return jsonify({"error": "Book not available for purchase"}), 400

    if book.get("sale_type") not in ("fixed", "both"):
        return jsonify({"error": "Use auction flow or accepted offer for this listing"}), 400

    amount = float(book.get("price", 0))
    order = {
        "tenant_id": tid,
        "book_id": boid,
        "buyer_id": ObjectId(buyer),
        "seller_id": book["seller_id"],
        "amount": amount,
        "status": "pending_payment",
        "source": "buy_now",
        "created_at": utcnow(),
        "invoice_number": f"ORD-{str(boid)[:8].upper()}",
    }
    ins = mongo.db.orders.insert_one(order)
    mongo.db.books.update_one(
        {"_id": boid},
        {"$set": {"status": "pending_payment", "locked_for_buyer": ObjectId(buyer), "final_price": amount}},
    )
    return jsonify({"order_id": str(ins.inserted_id)}), 201


@bp.get("/mine")
@session_required
def my_orders():
    tid, err = _tenant()
    if err:
        return err
    uid = get_current_user_id()
    side = request.args.get("side", "buyer")
    q: dict = {"tenant_id": tid}
    if side == "seller":
        q["seller_id"] = ObjectId(uid)
    else:
        q["buyer_id"] = ObjectId(uid)
    cur = mongo.db.orders.find(q).sort("created_at", -1).limit(100)
    out = []
    for d in cur:
        d["_id"] = str(d["_id"])
        d["book_id"] = str(d["book_id"])
        d["buyer_id"] = str(d["buyer_id"])
        d["seller_id"] = str(d["seller_id"])
        if d.get("offer_id"):
            d["offer_id"] = str(d["offer_id"])
        out.append(d)
    return jsonify(out)


@bp.post("/<order_id>/ship")
@session_required
def ship_order(order_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        body = OrderShipBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    order = mongo.db.orders.find_one({"_id": oid, "tenant_id": tid})
    if not order:
        return jsonify({"error": "Not found"}), 404
    if str(order["seller_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403
    if order["status"] != "paid_held":
        return jsonify({"error": "Order not in shippable state"}), 400
    mongo.db.orders.update_one(
        {"_id": oid},
        {"$set": {"status": "shipped", "shipped_at": utcnow(), "tracking_number": body.tracking_number}},
    )
    return jsonify({"message": "Marked shipped"})


@bp.post("/<order_id>/confirm-delivery")
@session_required
def confirm_delivery(order_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = get_current_user_id()
    order = mongo.db.orders.find_one({"_id": oid, "tenant_id": tid})
    if not order:
        return jsonify({"error": "Not found"}), 404
    if str(order["buyer_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403
    if order["status"] != "shipped":
        return jsonify({"error": "Seller must ship before you can confirm delivery"}), 400

    now = utcnow()
    book = mongo.db.books.find_one({"_id": order["book_id"]}, {"isbn": 1})
    mongo.db.orders.update_one(
        {"_id": oid},
        {"$set": {"status": "delivered", "delivered_at": now}},
    )
    mongo.db.books.update_one(
        {"_id": order["book_id"]},
        {"$set": {"status": "sold", "sold_at": now}},
    )
    mongo.db.transactions.insert_one(
        {
            "tenant_id": tid,
            "book_id": order["book_id"],
            "amount": order["amount"],
            "status": "completed",
            "created_at": now,
            "isbn": (book or {}).get("isbn"),
            "order_id": oid,
            "type": "sale_settled",
        }
    )
    payout = initiate_payout(order)
    return jsonify({"message": "Delivery confirmed; escrow released (simulated)", "payout": payout})


@bp.post("/<order_id>/refund")
@session_required
def refund_order(order_id):
    try:
        oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    tid, err = _tenant()
    if err:
        return err
    order = mongo.db.orders.find_one({"_id": oid, "tenant_id": tid})
    if not order:
        return jsonify({"error": "Not found"}), 404
    mongo.db.orders.update_one({"_id": oid}, {"$set": {"status": "refunded", "refunded_at": utcnow()}})
    mongo.db.books.update_one(
        {"_id": order["book_id"]},
        {"$set": {"status": "available"}, "$unset": {"locked_for_buyer": "", "final_price": "", "pending_order_id": ""}},
    )
    return jsonify(handle_refund_stub(oid, "manual"))
