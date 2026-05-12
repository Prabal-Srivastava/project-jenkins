#!/usr/bin/env python
"""
Remove super_admin utility.
Run from the backend/ folder with venv active:

    python remove_admin.py

Lists all super_admin accounts and lets you delete one or all.
After deletion you can re-run seed_admin.py to create a fresh admin.
"""

import sys
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import mongo


def main():
    app = create_app()
    with app.app_context():
        db = mongo.db

        admins = list(db.users.find({"role": "super_admin"}, {"password_hash": 0}))

        if not admins:
            print("No super_admin accounts found.")
            sys.exit(0)

        print("=" * 50)
        print("  Found super_admin account(s):")
        print("=" * 50)
        for i, a in enumerate(admins):
            print(f"  [{i}]  {a['email']}  (tenant: {a.get('tenant_id')})  id: {a['_id']}")

        print("\nOptions:")
        print("  Enter index number to delete that account")
        print("  Enter 'all' to delete all super_admin accounts")
        print("  Enter 'q' to quit without deleting")

        choice = input("\nYour choice: ").strip().lower()

        if choice == "q":
            print("Aborted. Nothing deleted.")
            sys.exit(0)

        targets = []
        if choice == "all":
            targets = admins
        elif choice.isdigit() and int(choice) < len(admins):
            targets = [admins[int(choice)]]
        else:
            print("Invalid choice. Aborted.")
            sys.exit(1)

        confirm = input(f"\nDelete {len(targets)} account(s)? Type YES to confirm: ").strip()
        if confirm != "YES":
            print("Aborted. Nothing deleted.")
            sys.exit(0)

        for a in targets:
            db.users.delete_one({"_id": a["_id"]})
            db.subscriptions.delete_many({"user_id": a["_id"]})
            print(f"  ✓ Deleted {a['email']} and their subscription.")

        print("\nDone. Run  python seed_admin.py  to create a new admin.")


if __name__ == "__main__":
    main()
