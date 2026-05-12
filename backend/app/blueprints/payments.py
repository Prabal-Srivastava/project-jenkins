"""Stripe Checkout + webhook — escrow: paid_held until buyer confirms delivery."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request
from pydantic import BaseModel, ValidationError, model_validator

from app.extensions import mongo
from app.utils import utcnow

bp = Blueprint("payments", __name__, url_prefix="/api/payments")


class CheckoutBody(BaseModel):
    order_id: str | None = None
    offer_id: str | None = None

    @model_validator(mode="after")
    def one_ref(self):
        if not self.order_id and not self.offer_id:
            raise ValueError("order_id or offer_id required")
        return self


def _resolve_order(body: CheckoutBody):
    if body.order_id:
        try:
            oid = ObjectId(body.order_id)
        except InvalidId:
            return None, (jsonify({"error": "Invalid order_id"}), 400)
        order = mongo.db.orders.find_one({"_id": oid, "status": "pending_payment"})
        if not order:
            return None, (jsonify({"error": "Order not found or not payable"}), 404)
        return order, None
    try:
        ofid = ObjectId(body.offer_id)
    except InvalidId:
        return None, (jsonify({"error": "Invalid offer_id"}), 400)
    order = mongo.db.orders.find_one({"offer_id": ofid, "status": "pending_payment"})
    if not order:
        return None, (jsonify({"error": "No pending order for this offer"}), 404)
    return order, None


@bp.post("/create-checkout-session")
def create_checkout():
    stripe_key = current_app.config.get("STRIPE_SECRET_KEY")
    if not stripe_key:
        return jsonify({"error": "Stripe not configured"}), 503
    try:
        body = CheckoutBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    import stripe

    stripe.api_key = stripe_key
    order, err = _resolve_order(body)
    if err:
        return err
    book = mongo.db.books.find_one({"_id": order["book_id"]})
    if not book:
        return jsonify({"error": "Book not found"}), 404

    amount = float(order.get("amount", 0))
    unit_cents = int(round(amount * 100))
    base = current_app.config["PUBLIC_APP_URL"].rstrip("/")
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": book.get("title", "Book")},
                    "unit_amount": unit_cents,
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        success_url=base + "/success",
        cancel_url=base + "/cancel",
        metadata={
            "order_id": str(order["_id"]),
            "book_id": str(book["_id"]),
            "tenant_id": str(order.get("tenant_id", "")),
            "escrow": "true",
        },
    )
    mongo.db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"stripe_checkout_session_id": session.id, "updated_at": utcnow()}},
    )
    return jsonify({"url": session.url})


@bp.post("/webhook")
def stripe_webhook():
    stripe_key = current_app.config.get("STRIPE_SECRET_KEY")
    wh_secret = current_app.config.get("STRIPE_WEBHOOK_SECRET")
    if not stripe_key or not wh_secret:
        return "", 503

    import stripe

    stripe.api_key = stripe_key
    payload = request.get_data()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, wh_secret)
    except ValueError:
        return "Invalid payload", 400
    except stripe.error.SignatureVerificationError:
        return "Invalid signature", 400

    if event["type"] == "checkout.session.completed":
        obj = event["data"]["object"]
        meta = obj.get("metadata") or {}
        order_id = meta.get("order_id")
        tenant_id = meta.get("tenant_id")
        book_id = meta.get("book_id")
        now = utcnow()
        if order_id:
            try:
                oid = ObjectId(order_id)
            except InvalidId:
                return "", 200
            mongo.db.orders.update_one(
                {"_id": oid},
                {
                    "$set": {
                        "status": "paid_held",
                        "paid_at": now,
                        "stripe_session_id": obj.get("id"),
                        "amount_captured": (obj.get("amount_total") or 0) / 100.0,
                    }
                },
            )
            if book_id:
                mongo.db.books.update_one(
                    {"_id": ObjectId(book_id)},
                    {"$set": {"escrow_paid": True, "payment_received_at": now}},
                )
            return "", 200

        if book_id and not order_id:
            bid = ObjectId(book_id)
            book = mongo.db.books.find_one({"_id": bid}, {"isbn": 1})
            mongo.db.books.update_one(
                {"_id": bid},
                {"$set": {"status": "sold", "sold_at": now}},
            )
            mongo.db.transactions.insert_one(
                {
                    "book_id": bid,
                    "amount": (obj.get("amount_total") or 0) / 100.0,
                    "tenant_id": tenant_id,
                    "stripe_session_id": obj.get("id"),
                    "status": "completed",
                    "created_at": now,
                    "isbn": (book or {}).get("isbn"),
                    "type": "legacy_checkout",
                }
            )
    return "", 200
