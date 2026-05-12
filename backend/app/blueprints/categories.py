"""BookCatalog categories — admin manages, public reads."""
from __future__ import annotations

from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from app.decorators import require_roles
from app.extensions import mongo
from app.utils import utcnow

bp = Blueprint("categories", __name__, url_prefix="/api/categories")


class CategoryBody(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(min_length=2, max_length=100)
    description: str | None = None
    icon: str | None = None


@bp.get("")
def list_categories():
    cur = mongo.db.categories.find({}).sort("name", 1)
    out = []
    for c in cur:
        c["_id"] = str(c["_id"])
        out.append(c)
    return jsonify(out)


@bp.post("")
@require_roles("super_admin")
def create_category():
    try:
        body = CategoryBody.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    if mongo.db.categories.find_one({"slug": body.slug}):
        return jsonify({"error": "Slug already exists"}), 409
    ins = mongo.db.categories.insert_one({
        "name": body.name, "slug": body.slug,
        "description": body.description, "icon": body.icon,
        "created_at": utcnow(),
    })
    return jsonify({"id": str(ins.inserted_id)}), 201


@bp.delete("/<cat_id>")
@require_roles("super_admin")
def delete_category(cat_id):
    res = mongo.db.categories.delete_one({"_id": ObjectId(cat_id)})
    if res.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})
