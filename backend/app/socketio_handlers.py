"""Real-time chat: join conversation rooms and broadcast new messages."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from flask_socketio import emit, join_room

from app.extensions import mongo, socketio
from app.utils import utcnow


def _uid_from_session(session_id: str) -> str | None:
    """Validate session_id and return user_id string, or None if invalid."""
    if not session_id:
        return None
    from app.utils import utcnow as _now
    session = mongo.db.sessions.find_one({
        "session_id": session_id,
        "expires_at": {"$gt": _now()}
    })
    if session:
        return str(session["user_id"])
    return None


def register_socketio_handlers(app):
    @socketio.on("connect")
    def on_connect(auth):
        session_id = (auth or {}).get("session_id") if isinstance(auth, dict) else None
        if not session_id:
            return False
        uid = _uid_from_session(session_id)
        if not uid:
            return False
        join_room(f"user_{uid}")
        return True

    @socketio.on("join_conversation")
    def on_join_conversation(data):
        session_id = (data or {}).get("session_id")
        cid = (data or {}).get("conversation_id")
        if not session_id or not cid:
            emit("error", {"message": "session_id and conversation_id required"})
            return
        uid = _uid_from_session(session_id)
        if not uid:
            emit("error", {"message": "invalid or expired session"})
            return
        try:
            conv_oid = ObjectId(cid)
        except InvalidId:
            emit("error", {"message": "invalid conversation_id"})
            return
        conv = mongo.db.conversations.find_one(
            {"_id": conv_oid, "participants": ObjectId(uid)}
        )
        if not conv:
            emit("error", {"message": "forbidden"})
            return
        join_room(cid)
        emit("joined", {"conversation_id": cid})

    @socketio.on("chat_message")
    def on_chat_message(data):
        session_id = (data or {}).get("session_id")
        cid = (data or {}).get("conversation_id")
        body = (data or {}).get("body", "").strip()
        if not session_id or not cid or not body:
            emit("error", {"message": "missing fields"})
            return
        uid = _uid_from_session(session_id)
        if not uid:
            emit("error", {"message": "invalid or expired session"})
            return
        try:
            conv_oid = ObjectId(cid)
        except InvalidId:
            emit("error", {"message": "invalid conversation_id"})
            return
        conv = mongo.db.conversations.find_one(
            {"_id": conv_oid, "participants": ObjectId(uid)}
        )
        if not conv:
            emit("error", {"message": "forbidden"})
            return
        doc = {
            "tenant_id": conv["tenant_id"],
            "conversation_id": conv_oid,
            "sender_id": ObjectId(uid),
            "body": body[:8000],
            "created_at": utcnow(),
        }
        ins = mongo.db.messages.insert_one(doc)
        payload = {
            "id": str(ins.inserted_id),
            "conversation_id": cid,
            "sender_id": uid,
            "body": doc["body"],
            "created_at": doc["created_at"].isoformat() + "Z",
        }
        emit("chat_message", payload, room=cid)
