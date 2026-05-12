from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from app.decorators import require_roles
from app.extensions import mongo
from app.utils import utcnow

bp = Blueprint("tenants", __name__, url_prefix="/api/tenants")


class TenantCreateBody(BaseModel):
    slug: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=1, max_length=200)


@bp.get("")
def list_tenants():
    cur = mongo.db.tenants.find({}, {"slug": 1, "name": 1, "created_at": 1}).limit(200)
    out = []
    for t in cur:
        t["_id"] = str(t["_id"])
        out.append(t)
    return jsonify(out)


@bp.post("")
@require_roles("super_admin")
def create_tenant():
    try:
        body = TenantCreateBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    if mongo.db.tenants.find_one({"slug": body.slug}):
        return jsonify({"error": "Slug exists"}), 409
    ins = mongo.db.tenants.insert_one(
        {"slug": body.slug, "name": body.name, "created_at": utcnow()}
    )
    return jsonify({"id": str(ins.inserted_id)}), 201
