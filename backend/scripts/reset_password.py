"""Reset the password for an existing auth user (admin or store owner).

Looks up the user by email and updates their password via the Supabase
Admin API. Use this instead of create_admin.py / create_store_owner.py
when the account already exists and you just forgot the password --
those scripts skip the password update if the auth user is already
provisioned.

Usage:
    uv run python scripts/reset_password.py <email> <new_password>
"""

import sys

from backend.core.supabase import get_supabase


def main() -> None:
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <email> <new_password>")
        raise SystemExit(1)

    email, new_password = sys.argv[1], sys.argv[2]
    supabase = get_supabase()

    match = next((u for u in supabase.auth.admin.list_users() if u.email == email), None)
    if match is None:
        print(f"No auth user found for {email}")
        raise SystemExit(1)

    supabase.auth.admin.update_user_by_id(match.id, {"password": new_password})
    print(f"Password updated for {email} ({match.id})")


if __name__ == "__main__":
    main()
