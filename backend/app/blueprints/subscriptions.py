from __future__ import annotations

from bson import ObjectId
from flask import Blueprint, g, jsonify, request
from app.decorators import session_required, get_current_user_id
from pydantic import ValidationError

from app.extensions import mongo
from app.models import DEFAULT_PLANS, SubscriptionUpgradeBody
from app.utils import utcnow

bp = Blueprint("subscriptions", __name__, url_prefix="/api/subscriptions")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


@bp.get("/me")
@session_required
def subscription_me():
    tid, err = _tenant()
    if err:
        return err
    uid = get_current_user_id()
    sub = mongo.db.subscriptions.find_one({"user_id": ObjectId(uid), "tenant_id": tid, "status": "active"})
    if not sub:
        return jsonify({"error": "No subscription"}), 404
    sub["_id"] = str(sub["_id"])
    sub["user_id"] = str(sub["user_id"])
    return jsonify(sub)


@bp.post("/upgrade")
@session_required
def subscription_upgrade():
    tid, err = _tenant()
    if err:
        return err
    try:
        body = SubscriptionUpgradeBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    if body.plan_type not in DEFAULT_PLANS:
        return jsonify({"error": "Invalid plan"}), 400
    uid = get_current_user_id()
    plan = DEFAULT_PLANS[body.plan_type]
    now = utcnow()
    mongo.db.subscriptions.update_one(
        {"user_id": ObjectId(uid), "tenant_id": tid},
        {
            "$set": {
                "plan_type": body.plan_type,
                "features": plan["features"],
                "status": "active",
                "updated_at": now,
            },
            "$setOnInsert": {
                "user_id": ObjectId(uid),
                "tenant_id": tid,
                "created_at": now,
            },
        },
        upsert=True,
    )
    return jsonify({"message": f"Plan set to {body.plan_type}", "features": plan["features"]})
