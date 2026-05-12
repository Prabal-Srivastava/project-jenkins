"""TicketSystem — dispute resolution for 'book not as described' complaints."""
from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import BaseModel, Field, ValidationError
from typing import Literal

from app.decorators import require_roles
from app.extensions import mongo
from app.utils import utcnow

bp = Blueprint("tickets", __name__, url_prefix="/api/tickets")

TicketStatus = Literal["open", "in_review", "resolved", "closed"]


class TicketCreateBody(BaseModel):
    order_id: str
    subject: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=2000)


class TicketReplyBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class TicketStatusBody(BaseModel):
    status: TicketStatus
    resolution_note: str | None = None


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


def _ser(d: dict) -> dict:
    d = dict(d)
    d["_id"] = str(d["_id"])
    for f in ("order_id", "buyer_id", "seller_id"):
        if d.get(f):
            d[f] = str(d[f])
    return d


@bp.post("")
@session_required
def create_ticket():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = TicketCreateBody.model_validate(request.get_json(force=True, silent=True) or {})
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

    if mongo.db.tickets.find_one({"order_id": oid, "status": {"$in": ["open", "in_review"]}}):
        return jsonify({"error": "An open ticket already exists for this order"}), 409

    doc = {
        "tenant_id": tid,
        "order_id": oid,
        "buyer_id": ObjectId(uid),
        "seller_id": order["seller_id"],
        "subject": body.subject,
        "description": body.description,
        "status": "open",
        "messages": [],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    ins = mongo.db.tickets.insert_one(doc)
    return jsonify({"id": str(ins.inserted_id)}), 201


@bp.get("/mine")
@session_required
def my_tickets():
    tid, err = _tenant()
    if err:
        return err
    uid = ObjectId(get_current_user_id())
    cur = mongo.db.tickets.find(
        {"tenant_id": tid, "$or": [{"buyer_id": uid}, {"seller_id": uid}]}
    ).sort("created_at", -1).limit(50)
    return jsonify([_ser(d) for d in cur])


@bp.post("/<ticket_id>/reply")
@session_required
def reply(ticket_id):
    tid, err = _tenant()
    if err:
        return err
    try:
        body = TicketReplyBody.model_validate(request.get_json(force=True, silent=True) or {})
        oid  = ObjectId(ticket_id)
    except (ValidationError, InvalidId) as e:
        return jsonify({"error": str(e)}), 400

    uid    = get_current_user_id()
    ticket = mongo.db.tickets.find_one({"_id": oid, "tenant_id": tid})
    if not ticket:
        return jsonify({"error": "Not found"}), 404
    if str(ticket["buyer_id"]) != uid and str(ticket["seller_id"]) != uid:
        return jsonify({"error": "Forbidden"}), 403

    msg = {"sender_id": uid, "message": body.message, "sent_at": utcnow()}
    mongo.db.tickets.update_one(
        {"_id": oid},
        {"$push": {"messages": msg}, "$set": {"updated_at": utcnow()}},
    )
    return jsonify({"ok": True})


@bp.get("")
@require_roles("super_admin")
def list_all_tickets():
    tid, err = _tenant()
    if err:
        return err
    status = request.args.get("status")
    q: dict = {"tenant_id": tid}
    if status:
        q["status"] = status
    cur = mongo.db.tickets.find(q).sort("created_at", -1).limit(200)
    return jsonify([_ser(d) for d in cur])


@bp.patch("/<ticket_id>/status")
@require_roles("super_admin")
def update_status(ticket_id):
    try:
        body = TicketStatusBody.model_validate(request.get_json(force=True, silent=True) or {})
        oid  = ObjectId(ticket_id)
    except (ValidationError, InvalidId) as e:
        return jsonify({"error": str(e)}), 400

    upd = {"status": body.status, "updated_at": utcnow()}
    if body.resolution_note:
        upd["resolution_note"] = body.resolution_note
    res = mongo.db.tickets.update_one({"_id": oid}, {"$set": upd})
    if res.matched_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})
