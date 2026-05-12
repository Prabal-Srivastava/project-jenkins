from __future__ import annotations

import secrets
from datetime import datetime, timedelta

import bcrypt
from bson import ObjectId
from flask import Blueprint, current_app, jsonify, request, make_response
from pydantic import ValidationError

from app.extensions import mongo
from app.models import (
    DEFAULT_PLANS,
    PASSWORD_RULES,
    ForgotPasswordBody,
    LoginBody,
    RegisterBody,
    ResetPasswordBody,
    VerifyEmailBody,
)
from app.utils import utcnow

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Session management constants
SESSION_COOKIE_NAME = "session_id"
SESSION_DURATION_DAYS = 30


def _users():
    return mongo.db.users


def _seed_subscription(user_oid: ObjectId, tenant_id: str, plan_type: str = "basic"):
    plan = DEFAULT_PLANS[plan_type]
    now = utcnow()
    mongo.db.subscriptions.update_one(
        {"user_id": user_oid, "tenant_id": tenant_id},
        {
            "$set": {
                "user_id": user_oid,
                "tenant_id": tenant_id,
                "plan_type": plan_type,
                "features": plan["features"],
                "status": "active",
                "expiry_date": None,
                "updated_at": now,
            }
        },
        upsert=True,
    )


def _create_session(user_id: str, tenant_id: str, role: str) -> str:
    """Create a new session in MongoDB and return session_id."""
    session_id = secrets.token_urlsafe(32)
    now = utcnow()
    expires_at = now + timedelta(days=SESSION_DURATION_DAYS)
    
    mongo.db.sessions.insert_one({
        "session_id": session_id,
        "user_id": ObjectId(user_id),
        "tenant_id": tenant_id,
        "role": role,
        "created_at": now,
        "expires_at": expires_at,
        "last_activity": now,
    })
    
    return session_id


def _get_session(session_id: str) -> dict | None:
    """Retrieve session from MongoDB if valid."""
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


def _delete_session(session_id: str) -> None:
    """Delete session from MongoDB."""
    if session_id:
        mongo.db.sessions.delete_one({"session_id": session_id})


@bp.get("/rules")
def registration_rules():
    """Public endpoint — returns registration requirements shown in the UI."""
    return jsonify({
        "email": "Must be a @gmail.com address.",
        "password": PASSWORD_RULES,
        "password_checklist": [
            "At least 8 characters",
            "At least one uppercase letter (A-Z)",
            "At least one lowercase letter (a-z)",
            "At least one digit (0-9)",
            "At least one special character (!@#$%^&* etc.)",
        ],
        "roles_available": ["buyer", "individual_seller", "store_owner"],
        "note": "Admin accounts are created only via database seed — not through this form.",
    })


@bp.post("/register")
def register():
    try:
        body = RegisterBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    if _users().find_one({"email": body.email}):
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    verify_token = secrets.token_urlsafe(32)
    now = utcnow()
    doc = {
        "email": body.email,
        "password_hash": pw_hash,
        "role": body.role,
        "tenant_id": body.tenant_id,
        "email_verified": False,
        "verification_token": verify_token,
        "verification_sent_at": now,
        "created_at": now,
    }
    res = _users().insert_one(doc)
    user_id = str(res.inserted_id)
    _seed_subscription(res.inserted_id, body.tenant_id, "basic")

    # Create session
    session_id = _create_session(user_id, body.tenant_id, body.role)
    
    resp = make_response(jsonify({
        "user_id": user_id,
        "tenant_id": body.tenant_id,
        "verification_token": verify_token,
        "message": "Verify email with POST /api/auth/verify-email",
    }), 201)
    
    # Set session cookie
    resp.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=current_app.config.get("SESSION_COOKIE_SECURE", False),
        samesite="Lax"
    )
    
    return resp


@bp.post("/verify-email")
def verify_email():
    try:
        body = VerifyEmailBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user = _users().find_one({"verification_token": body.token})
    if not user:
        return jsonify({"error": "Invalid token"}), 400

    _users().update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True, "verification_token": None}, "$unset": {"verification_sent_at": ""}},
    )
    return jsonify({"message": "Email verified"})


@bp.post("/forgot-password")
def forgot_password():
    try:
        body = ForgotPasswordBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user = _users().find_one({"email": body.email})
    token = secrets.token_urlsafe(32)
    if user:
        _users().update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_token": token, "reset_token_expires": utcnow() + timedelta(hours=2)}},
        )
    payload = {"message": "If the email exists, a reset token was issued."}
    if current_app.config.get("EXPOSE_PASSWORD_RESET_TOKEN") and user:
        payload["reset_token"] = token
    return jsonify(payload)


@bp.post("/reset-password")
def reset_password():
    try:
        body = ResetPasswordBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user = _users().find_one({"reset_token": body.token})
    if not user or user.get("reset_token_expires", datetime.min) < utcnow():
        return jsonify({"error": "Invalid or expired token"}), 400

    pw_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    _users().update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": pw_hash}, "$unset": {"reset_token": "", "reset_token_expires": ""}},
    )
    return jsonify({"message": "Password updated"})


@bp.post("/login")
def login():
    try:
        body = LoginBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400

    user = _users().find_one({"email": body.email})
    if not user or not bcrypt.checkpw(body.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401

    user_id = str(user["_id"])
    
    # Create session
    session_id = _create_session(user_id, user["tenant_id"], user["role"])
    
    resp = make_response(jsonify({
        "tenant_id": user["tenant_id"],
        "role": user["role"],
        "email_verified": user.get("email_verified", False),
    }))
    
    # Set session cookie
    resp.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=current_app.config.get("SESSION_COOKIE_SECURE", False),
        samesite="Lax"
    )
    
    return resp


@bp.post("/logout")
def logout():
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    _delete_session(session_id)
    
    resp = make_response(jsonify({"message": "Logged out"}))
    resp.set_cookie(SESSION_COOKIE_NAME, "", max_age=0)
    return resp


@bp.get("/socket-token")
def socket_token():
    """Issue a short-lived socket token from the current session (for WebSocket auth)."""
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    session = _get_session(session_id)
    if not session:
        return jsonify({"error": "Not authenticated"}), 401
    # Reuse the session_id as the socket token — it's already validated above
    return jsonify({"socket_token": session_id})


@bp.get("/me")
def me():
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    session = _get_session(session_id)
    
    if not session:
        return jsonify({"error": "Not authenticated"}), 401
    
    uid = str(session["user_id"])
    user = _users().find_one({"_id": ObjectId(uid)}, {"password_hash": 0, "reset_token": 0, "verification_token": 0})
    if not user:
        return jsonify({"error": "Not found"}), 404
    
    user["_id"] = str(user["_id"])
    tid = user.get("tenant_id")
    sub = mongo.db.subscriptions.find_one({"user_id": ObjectId(uid), "tenant_id": tid, "status": "active"})
    if sub:
        sub["_id"]     = str(sub["_id"])
        sub["user_id"] = str(sub["user_id"])
        user["subscription"] = sub
    return jsonify(user)
