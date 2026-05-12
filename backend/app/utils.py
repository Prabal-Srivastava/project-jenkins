"""Core business helpers: pricing, market signals, edition checks."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId


def get_book_valuation(original_price: float, condition_score: int, age_years: float) -> float:
    """
    Suggested list price from MSRP, condition (1=poor .. 5=like new), and age.
    """
    depreciation_rate = min(0.15 * age_years, 0.95)
    condition_multiplier = condition_score / 5
    suggested = (original_price * (1 - depreciation_rate)) * condition_multiplier
    return max(float(suggested), 2.0)


def calculate_depreciation(original_price: float, condition_score: int, age_years: float) -> dict[str, float]:
    """Expose depreciation breakdown for UI (sell-back calculator)."""
    depreciation_rate = min(0.15 * age_years, 0.95)
    after_age = original_price * (1 - depreciation_rate)
    condition_multiplier = condition_score / 5
    suggested = max(after_age * condition_multiplier, 2.0)
    return {
        "suggested_price": round(suggested, 2),
        "after_age_depreciation": round(after_age, 2),
        "depreciation_rate": round(depreciation_rate, 4),
        "condition_multiplier": round(condition_multiplier, 4),
    }


def calculate_market_value(db: Any, isbn: str, tenant_id: str, limit: int = 5) -> dict[str, Any]:
    """Average of last N completed sales for this ISBN within the tenant."""
    cur = (
        db.transactions.find(
            {"isbn": isbn, "tenant_id": tenant_id, "status": "completed"},
            {"amount": 1},
        )
        .sort("created_at", -1)
        .limit(limit)
    )
    amounts = [doc["amount"] for doc in cur if doc.get("amount") is not None]
    if not amounts:
        return {"count": 0, "average": None}
    return {"count": len(amounts), "average": round(sum(amounts) / len(amounts), 2)}


def verify_edition(isbn: str, claimed_year: int | None, api_published_year: int | None) -> dict[str, Any]:
    """
    Compare user-claimed edition year against an external API year when available.
    When api_published_year is None, caller should fetch from Google Books etc.
    """
    if api_published_year is None or claimed_year is None:
        return {"ok": True, "reason": "insufficient_data"}
    if claimed_year != api_published_year:
        return {
            "ok": False,
            "reason": "year_mismatch",
            "claimed_year": claimed_year,
            "api_year": api_published_year,
        }
    return {"ok": True, "reason": "match"}


def tenant_query(tenant_id: str, extra: dict | None = None) -> dict:
    q: dict = {"tenant_id": tenant_id}
    if extra:
        q.update(extra)
    return q


def oid(s: str) -> ObjectId:
    return ObjectId(s)


def utcnow() -> datetime:
    return datetime.utcnow()


def location_nearby_query(tenant_id: str, city: str | None, university: str | None) -> dict:
    q: dict = {"tenant_id": tenant_id, "status": "available"}
    if city:
        q["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if university:
        q["university"] = {"$regex": f"^{university}$", "$options": "i"}
    return q
