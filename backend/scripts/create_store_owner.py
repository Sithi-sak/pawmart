"""Provision (or re-provision) a store owner account and their store.

Mirrors create_admin.py: creates an auth.users row via the Supabase Admin
API (bypassing normal signup/email-confirmation), sets the matching
customers row to role='store_owner', and upserts a stores row owned by
that user. Safe to rerun: if the email already has an auth user, it's
reused; the customers and stores rows are just upserted.

Usage:
    uv run python scripts/create_store_owner.py <email> <password> <store_name> <store_slug> [full_name]
"""

import sys

from backend.core.supabase import get_supabase
from backend.services.store_owner import provision_store_owner


def main() -> None:
    if len(sys.argv) < 5:
        print(f"Usage: {sys.argv[0]} <email> <password> <store_name> <store_slug> [full_name]")
        raise SystemExit(1)

    email, password, store_name, store_slug = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    full_name = sys.argv[5] if len(sys.argv) > 5 else email

    supabase = get_supabase()
    result = provision_store_owner(
        supabase,
        email=email,
        password=password,
        full_name=full_name,
        store_name=store_name,
        store_slug=store_slug,
    )
    print(f"store owner ready: user={result['user_id']} store={result['store']['slug']}")


if __name__ == "__main__":
    main()
