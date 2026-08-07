"""Provision (or re-provision) an admin account.

Creates an auth.users row via the Supabase Admin API (bypassing normal
signup/email-confirmation) and sets the matching customers row to
role='admin'. Safe to rerun: if the email already has an auth user, it's
reused and the customers row is just upserted to admin.

Usage:
    uv run python scripts/create_admin.py <email> <password> [full_name]
"""

import sys

from backend.core.supabase import get_supabase


def main() -> None:
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <email> <password> [full_name]")
        raise SystemExit(1)

    email, password = sys.argv[1], sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else email

    supabase = get_supabase()

    try:
        created = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name},
            }
        )
        user_id = created.user.id
        print(f"Created auth user {user_id}")
    except Exception:
        match = next((u for u in supabase.auth.admin.list_users() if u.email == email), None)
        if match is None:
            raise
        user_id = match.id
        print(f"Auth user already exists: {user_id}")

    supabase.table("customers").upsert(
        {"id": user_id, "email": email, "full_name": full_name, "role": "admin"}
    ).execute()
    print(f"customers row set to role=admin for {email}")


if __name__ == "__main__":
    main()
