#!/usr/bin/env python
"""
One-time super_admin seed script.
Run ONCE from the backend/ folder with venv active:

    python seed_admin.py

It will prompt for email and password, validate them, and insert the
super_admin user + enterprise subscription into MongoDB.
It refuses to run if a super_admin already exists.
"""

import getpass
import re
import sys

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import mongo
from app.models import DEFAULT_PLANS, PASSWORD_RULES, _GMAIL_RE, _PASSWORD_RE
from app.utils import utcnow

import bcrypt
import secrets


def main():
    app = create_app()
    with app.app_context():
        db = mongo.db

        # Guard: only one super_admin ever
        if db.users.find_one({"role": "super_admin"}):
            print("❌  A super_admin already exists. Seed aborted.")
            sys.exit(1)

        print("=" * 55)
        print("  Purani Books — Super Admin One-Time Seed")
        print("=" * 55)
        print("This script creates the ONLY super_admin account.")
        print("It cannot be run again once an admin exists.\n")

        # Email
        while True:
            email = input("Admin Gmail address: ").strip().lower()
            if not _GMAIL_RE.match(email):
                print("  ✗ Must be a @gmail.com address.\n")
                continue
            if db.users.find_one({"email": email}):
                print("  ✗ Email already registered.\n")
                continue
            break

        # Password
        print(f"\nPassword rules:\n  {PASSWORD_RULES}\n")
        while True:
            pw  = getpass.getpass("Password: ")
            pw2 = getpass.getpass("Confirm : ")
            if pw != pw2:
                print("  ✗ Passwords do not match.\n")
                continue
            if not _PASSWORD_RE.match(pw):
                print(f"  ✗ {PASSWORD_RULES}\n")
                continue
            break

        # Tenant
        tenant_id = input("\nTenant slug [default]: ").strip() or "default"

        # Ensure tenant exists
        if not db.tenants.find_one({"slug": tenant_id}):
            db.tenants.insert_one({"slug": tenant_id, "name": tenant_id.capitalize(), "created_at": utcnow()})
            print(f"  ✓ Tenant '{tenant_id}' created.")

        pw_hash = bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        now = utcnow()
        doc = {
            "email": email,
            "password_hash": pw_hash,
            "role": "super_admin",
            "tenant_id": tenant_id,
            "email_verified": True,
            "created_at": now,
        }
        res = db.users.insert_one(doc)
        oid = res.inserted_id

        plan = DEFAULT_PLANS["enterprise"]
        db.subscriptions.update_one(
            {"user_id": oid, "tenant_id": tenant_id},
            {
                "$set": {
                    "user_id": oid,
                    "tenant_id": tenant_id,
                    "plan_type": "enterprise",
                    "features": plan["features"],
                    "status": "active",
                    "expiry_date": None,
                    "updated_at": now,
                }
            },
            upsert=True,
        )

        print(f"\n✅  super_admin created: {email}  (tenant: {tenant_id})")
        print("   Login at /dashboard and navigate to /admin-panel")


if __name__ == "__main__":
    main()
