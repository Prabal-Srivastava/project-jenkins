from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.db_indexes import ensure_indexes
from app.extensions import mongo, scheduler, socketio
from app.jobs import register_jobs
from app.socketio_handlers import register_socketio_handlers
from app.tenant import register_tenant_hook


def create_app(config_class=Config):
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(
        app,
        resources={r"/api/*": {"origins": config_class.FRONTEND_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-Tenant-Id"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # 6 MB hard limit

    mongo.init_app(app)

    register_tenant_hook(app)

    with app.app_context():
        try:
            ensure_indexes()
        except Exception:
            app.logger.exception("ensure_indexes failed — check MONGO_URI and database permissions")

    from app.blueprints import (
        admin, analytics, auth, books, categories,
        conversations, dashboard, isbn, offers, orders,
        payments, reviews, subscriptions, tenants, tickets, uploads,
    )

    app.register_blueprint(admin.bp)
    app.register_blueprint(analytics.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(books.bp)
    app.register_blueprint(categories.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(offers.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(conversations.bp)
    app.register_blueprint(isbn.bp)
    app.register_blueprint(uploads.bp)
    app.register_blueprint(subscriptions.bp)
    app.register_blueprint(tenants.bp)
    app.register_blueprint(tickets.bp)
    app.register_blueprint(reviews.bp)

    socketio.init_app(
        app,
        cors_allowed_origins=config_class.FRONTEND_ORIGINS,
        async_mode="threading",
    )
    register_socketio_handlers(app)

    if app.config.get("SCHEDULER_ENABLED", True):
        scheduler.init_app(app)
        register_jobs(scheduler, app)
        scheduler.start()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
