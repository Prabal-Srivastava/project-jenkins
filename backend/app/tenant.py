"""Attach tenant_id to each request for shared-collection multi-tenancy."""

from __future__ import annotations

from flask import g, request


def register_tenant_hook(app):
    @app.before_request
    def load_tenant():
        g.tenant_id = None
        g.user_id = None
        g.role = None

        # Try to load session and set tenant from it
        from app.decorators import get_session
        session = get_session()
        if session:
            g.tenant_id = session.get("tenant_id")
            g.user_id = str(session["user_id"])
            g.role = session.get("role")

        # Header can override or provide tenant for unauthenticated requests
        header_tenant = request.headers.get("X-Tenant-Id")
        if not g.tenant_id and header_tenant:
            g.tenant_id = header_tenant

    @app.after_request
    def passthrough(resp):
        return resp
