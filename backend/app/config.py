import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-change-me")
    FRONTEND_ORIGINS = [
        o.strip()
        for o in os.environ.get(
            "FRONTEND_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        ).split(",")
        if o.strip()
    ]
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/book_saas_db")
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
    STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_CONNECT_CLIENT_ID = os.environ.get("STRIPE_CONNECT_CLIENT_ID", "")
    PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "http://127.0.0.1:5173")
    OFFER_EXPIRE_HOURS_BASIC = int(os.environ.get("OFFER_EXPIRE_HOURS_BASIC", "12"))
    OFFER_EXPIRE_HOURS_PRO = int(os.environ.get("OFFER_EXPIRE_HOURS_PRO", "48"))
    SCHEDULER_ENABLED = os.environ.get("SCHEDULER_ENABLED", "true").lower() == "true"
    ADMIN_SETUP_SECRET = os.environ.get("ADMIN_SETUP_SECRET", "")
    EXPOSE_PASSWORD_RESET_TOKEN = (
        os.environ.get("EXPOSE_PASSWORD_RESET_TOKEN", "false").lower() == "true"
    )
