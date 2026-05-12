"""ISBN lookup — fetches metadata from Open Library (no API key required)."""

from __future__ import annotations

import httpx
from flask import Blueprint, g, jsonify, request

bp = Blueprint("isbn", __name__, url_prefix="/api/isbn")


def _tenant():
    tid = getattr(g, "tenant_id", None)
    if not tid:
        return None, (jsonify({"error": "tenant_id required"}), 401)
    return tid, None


def _fetch_open_library(isbn: str) -> dict:
    """Fetch book metadata from Open Library (free, no key needed)."""
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    try:
        r = httpx.get(url, timeout=10.0)
        r.raise_for_status()
        data = r.json()
        key = f"ISBN:{isbn}"
        if key not in data:
            return {"found": False}
        vol = data[key]
        authors = [a.get("name") for a in (vol.get("authors") or [])]
        cover = (vol.get("cover") or {}).get("large") or (vol.get("cover") or {}).get("medium")
        published = vol.get("publish_date", "")
        year = None
        if published and len(published) >= 4 and published[-4:].isdigit():
            year = int(published[-4:])
        return {
            "found": True,
            "title": vol.get("title"),
            "authors": authors,
            "publisher": (vol.get("publishers") or [{}])[0].get("name"),
            "publishedDate": published,
            "published_year": year,
            "description": (vol.get("excerpts") or [{}])[0].get("text"),
            "image_url": cover,
        }
    except Exception as exc:
        return {"found": False, "error": str(exc)}


@bp.get("/<isbn>")
def lookup_isbn(isbn):
    tid, err = _tenant()
    if err:
        return err

    if not isbn.strip().isdigit() or len(isbn.strip()) not in (10, 13):
        return jsonify({"error": "Invalid ISBN format"}), 400

    # Check cache first
    from app.extensions import mongo
    from app.utils import utcnow
    from datetime import timedelta

    cached = mongo.db.isbn_cache.find_one({"isbn": isbn})
    if cached and cached.get("expires_at") and cached["expires_at"] > utcnow():
        data = cached["data"]
        data["cached"] = True
        return jsonify(data)

    vol = _fetch_open_library(isbn)

    # Cache for 30 days
    mongo.db.isbn_cache.update_one(
        {"isbn": isbn},
        {"$set": {"isbn": isbn, "data": vol, "expires_at": utcnow() + timedelta(days=30)}},
        upsert=True,
    )

    claimed = request.args.get("claimed_publication_year")
    if claimed and claimed.isdigit() and vol.get("published_year"):
        claimed_i = int(claimed)
        api_year = vol["published_year"]
        if claimed_i != api_year:
            vol["edition_check"] = {"ok": False, "reason": "year_mismatch", "claimed_year": claimed_i, "api_year": api_year}
        else:
            vol["edition_check"] = {"ok": True, "reason": "match"}

    return jsonify(vol)
