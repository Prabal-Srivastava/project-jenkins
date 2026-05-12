from __future__ import annotations

from functools import wraps

from bson import ObjectId
from flask import g, jsonify, request

from app.extensions import mongo


def get_session():
    """Get current session from cookie."""
    from app.blueprints.auth import SESSION_COOKIE_NAME
    from app.utils import utcnow
    
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return None
    
    session = mongo.db.sessions.find_one({
        "session_id": session_id,
        "expires_at": {"$gt": utcnow()}
    })
    
    if session:
        # Update last activity
        mongo.db.sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {"last_activity": utcnow()}}
        )
    
    return session


def get_current_user_id():
    """Get current user ID from session."""
    session = get_session()
    return str(session["user_id"]) if session else None


def session_required(f):
    """Decorator: requires valid session."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        session = get_session()
        if not session:
            return jsonify({"error": "Authentication required"}), 401
        
        # Set g.user_id, g.tenant_id, g.role for convenience
        g.user_id = str(session["user_id"])
        g.tenant_id = session["tenant_id"]
        g.role = session["role"]
        
        return f(*args, **kwargs)
    return wrapped


def require_roles(*roles: str):
    def decorator(f):
        @wraps(f)
        @session_required
        def wrapped(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden", "required_roles": list(roles)}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator


def require_tenant(f):
    """Decorator: ensures g.tenant_id is set, returns 401 otherwise."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not getattr(g, "tenant_id", None):
            return jsonify({"error": "tenant_id required (session or X-Tenant-Id header)"}), 401
        return f(*args, **kwargs)
    return wrapped


def require_plan_feature(feature_name: str):
    def decorator(f):
        @wraps(f)
        @session_required
        def wrapped(*args, **kwargs):
            tid = getattr(g, "tenant_id", None)
            if not tid:
                return jsonify({"error": "tenant_id required"}), 401
            uid = get_current_user_id()
            sub = mongo.db.subscriptions.find_one(
                {"user_id": ObjectId(uid), "tenant_id": tid, "status": "active"}
            )
            if not sub:
                return jsonify({"error": "No active subscription"}), 403
            if not (sub.get("features") or {}).get(feature_name):
                return jsonify({"error": "Upgrade your plan to use this feature"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator


def get_active_subscription(user_id: str, tenant_id: str) -> dict | None:
    return mongo.db.subscriptions.find_one(
        {"user_id": ObjectId(user_id), "tenant_id": tenant_id, "status": "active"}
    )


def count_user_listings(seller_id: str, tenant_id: str) -> int:
    return mongo.db.books.count_documents(
        {"seller_id": ObjectId(seller_id), "tenant_id": tenant_id, "status": {"$ne": "sold"}}
    )


def count_buyer_offers_this_month(buyer_id: str, tenant_id: str) -> int:
    from datetime import datetime
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    return mongo.db.offers.count_documents(
        {"buyer_id": ObjectId(buyer_id), "tenant_id": tenant_id, "created_at": {"$gte": start}}
    )
