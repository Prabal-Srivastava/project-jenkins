"""Pydantic request/response shapes — align API payloads with MongoDB documents."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

ConditionGrade = Literal["New", "Like New", "Good", "Fair", "Worn"]
BookStatus     = Literal["available", "pending", "pending_payment", "sold", "auction_pending"]
SaleType       = Literal["fixed", "auction", "both"]
UserRole       = Literal["super_admin", "store_owner", "individual_seller", "buyer", "admin", "seller"]
OfferStatus    = Literal["pending", "accepted", "rejected", "countered", "expired"]
OrderStatus    = Literal["pending_payment", "paid_held", "shipped", "delivered", "cancelled", "refunded"]

_GMAIL_RE    = re.compile(r"^[a-zA-Z0-9._%+\-]+@gmail\.com$", re.IGNORECASE)
_PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$")

PASSWORD_RULES = (
    "Password must be at least 8 characters and contain: "
    "one uppercase letter, one lowercase letter, one digit, "
    "and one special character (!@#$%^&* etc.)"
)


class RegisterBody(BaseModel):
    email: str
    password: str
    role: UserRole = "buyer"
    tenant_id: str = Field(default="default")

    @field_validator("role", mode="before")
    @classmethod
    def normalize_seller(cls, v):
        if v == "seller":
            return "individual_seller"
        # Public registration cannot create super_admin or admin
        if v in ("super_admin", "admin"):
            raise ValueError("Role 'super_admin' and 'admin' cannot be self-registered.")
        return v

    @field_validator("email")
    @classmethod
    def gmail_only(cls, v: str) -> str:
        if not _GMAIL_RE.match(v.strip()):
            raise ValueError("Only @gmail.com addresses are accepted.")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(PASSWORD_RULES)
        return v


class LoginBody(BaseModel):
    email: str
    password: str


class VerifyEmailBody(BaseModel):
    token: str


class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(PASSWORD_RULES)
        return v


class ConditionReport(BaseModel):
    rating: int = Field(ge=1, le=5)
    notes: str | None = None
    images: dict[str, str] = Field(default_factory=dict)

    @field_validator("images")
    @classmethod
    def require_verification_photos(cls, v: dict) -> dict:
        for key in ("cover", "spine", "page"):
            val = (v.get(key) or "").strip()
            if not val:
                raise ValueError(f"Condition photo '{key}' is required (cover, spine, page).")
            # Accept both https:// URLs and local /api/uploads/files/ paths
            if not (val.startswith("http://") or val.startswith("https://") or val.startswith("/api/uploads/")):
                raise ValueError(f"Photo '{key}' must be a valid URL or uploaded file path.")
        return v


class BookCreateBody(BaseModel):
    title: str
    isbn: str
    author: str | None = None
    course_code: str | None = None
    semester: str | None = None
    condition_grade: ConditionGrade
    condition_report: ConditionReport
    price: float = Field(gt=0)
    city: str | None = None
    university: str | None = None
    status: BookStatus = "available"
    original_retail_price: float | None = None
    publication_year_claimed: int | None = None
    image_url: str | None = None
    sale_type: SaleType = "fixed"
    min_bid: float | None = Field(default=None, gt=0)
    auction_end: datetime | None = None
    bid_increment: float = Field(default=1.0, gt=0)
    allow_offers: bool = False

    @model_validator(mode="after")
    def auction_requires_end(self):
        if self.sale_type in ("auction", "both") and self.auction_end is None:
            raise ValueError("auction_end is required for auction or both sale_type")
        return self


class BookUpdateBody(BaseModel):
    title: str | None = None
    price: float | None = Field(default=None, gt=0)
    status: BookStatus | None = None
    city: str | None = None
    university: str | None = None
    allow_offers: bool | None = None
    image_url: str | None = None
    condition_report: dict | None = None


class ValuationBody(BaseModel):
    original_price: float = Field(gt=0)
    condition_score: int = Field(ge=1, le=5)
    age_years: float = Field(ge=0)


class MarketValueQuery(BaseModel):
    isbn: str


class ISBNLookupQuery(BaseModel):
    isbn: str
    claimed_publication_year: int | None = None


class SubmitOfferBody(BaseModel):
    book_id: str
    offer_amount: float = Field(gt=0)


class CounterOfferBody(BaseModel):
    counter_price: float = Field(gt=0)


class PlaceBidBody(BaseModel):
    amount: float = Field(gt=0)


class CreateOrderBody(BaseModel):
    book_id: str


class OrderShipBody(BaseModel):
    tracking_number: str | None = None


class ConversationCreateBody(BaseModel):
    peer_user_id: str
    book_id: str | None = None


class MessageBody(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class WishlistAddBody(BaseModel):
    book_id: str


class AdminUserRolePatch(BaseModel):
    role: UserRole


class SubscriptionUpgradeBody(BaseModel):
    plan_type: Literal["basic", "pro", "enterprise"]


DEFAULT_PLANS = {
    "basic": {
        "plan_type": "basic",
        "features": {
            "can_bid": False,
            "can_make_offers": True,
            "max_listings": 10,
            "commission_rate": 0.10,
            "offers_per_month": 3,
        },
    },
    "pro": {
        "plan_type": "pro",
        "features": {
            "can_bid": True,
            "can_make_offers": True,
            "max_listings": 50,
            "commission_rate": 0.05,
            "offers_per_month": 999999,
        },
    },
    "enterprise": {
        "plan_type": "enterprise",
        "features": {
            "can_bid": True,
            "can_make_offers": True,
            "max_listings": 999999,
            "commission_rate": 0.02,
            "offers_per_month": 999999,
        },
    },
}
