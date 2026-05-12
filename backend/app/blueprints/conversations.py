from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import ValidationError

from app.extensions import mongo
from app.models import ConversationCreateBody, MessageBody
from app.utils import utcnow

bp = Blueprint("conversations", __name__, url_prefix="/api/conversations")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


@bp.post("")
@session_required
def create_conversation():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = ConversationCreateBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    uid = get_current_user_id()
    try:
        peer = ObjectId(body.peer_user_id)
    except InvalidId:
        return jsonify({"error": "Invalid peer"}), 400
    me = ObjectId(uid)
    if peer == me:
        return jsonify({"error": "Invalid peer"}), 400
    participants = sorted([me, peer], key=str)
    filt = {"tenant_id": tid, "participants": participants}
    if body.book_id:
        try:
            filt["book_id"] = ObjectId(body.book_id)
        except InvalidId:
            return jsonify({"error": "Invalid book_id"}), 400
    existing = mongo.db.conversations.find_one(filt)
    if existing:
        return jsonify({"id": str(existing["_id"]), "existing": True})
    doc = {
        "tenant_id": tid,
        "participants": participants,
        "created_at": utcnow(),
    }
    if body.book_id:
        doc["book_id"] = ObjectId(body.book_id)
    ins = mongo.db.conversations.insert_one(doc)
    return jsonify({"id": str(ins.inserted_id)}), 201


@bp.get("")
@session_required
def list_conversations():
    tid, err = _tenant()
    if err:
        return err
    uid = ObjectId(get_current_user_id())
    cur = mongo.db.conversations.find({"tenant_id": tid, "participants": uid}).sort("created_at", -1).limit(100)
    out = []
    for c in cur:
        c["_id"] = str(c["_id"])
        c["participants"] = [str(p) for p in c["participants"]]
        if c.get("book_id"):
            c["book_id"] = str(c["book_id"])
        out.append(c)
    return jsonify(out)


@bp.get("/<cid>/messages")
@session_required
def list_messages(cid):
    tid, err = _tenant()
    if err:
        return err
    try:
        conv_oid = ObjectId(cid)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = ObjectId(get_current_user_id())
    conv = mongo.db.conversations.find_one({"_id": conv_oid, "tenant_id": tid, "participants": uid})
    if not conv:
        return jsonify({"error": "Not found"}), 404
    cur = mongo.db.messages.find({"conversation_id": conv_oid}).sort("created_at", 1).limit(500)
    out = []
    for m in cur:
        m["_id"] = str(m["_id"])
        m["conversation_id"] = str(m["conversation_id"])
        m["sender_id"] = str(m["sender_id"])
        out.append(m)
    return jsonify(out)


@bp.post("/<cid>/messages")
@session_required
def post_message(cid):
    tid, err = _tenant()
    if err:
        return err
    try:
        body = MessageBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    try:
        conv_oid = ObjectId(cid)
    except InvalidId:
        return jsonify({"error": "Invalid id"}), 400
    uid = ObjectId(get_current_user_id())
    conv = mongo.db.conversations.find_one({"_id": conv_oid, "tenant_id": tid, "participants": uid})
    if not conv:
        return jsonify({"error": "Not found"}), 404
    doc = {
        "tenant_id": tid,
        "conversation_id": conv_oid,
        "sender_id": uid,
        "body": body.body,
        "created_at": utcnow(),
    }
    ins = mongo.db.messages.insert_one(doc)
    return jsonify({"id": str(ins.inserted_id)}), 201
