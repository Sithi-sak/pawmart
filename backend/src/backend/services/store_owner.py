"""Shared provisioning logic for turning someone into a store owner.

Used by scripts/create_store_owner.py (manual bootstrap) and the seller
application approval endpoint (routers/store_applications.py).
"""

import secrets
import string

from supabase import Client


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def provision_store_owner(
    supabase: Client,
    *,
    email: str,
    password: str,
    full_name: str,
    store_name: str,
    store_slug: str,
) -> dict:
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
    except Exception:
        match = next((u for u in supabase.auth.admin.list_users() if u.email == email), None)
        if match is None:
            raise
        user_id = match.id

    supabase.table("customers").upsert(
        {"id": user_id, "email": email, "full_name": full_name, "role": "store_owner"}
    ).execute()

    # Keyed on owner_id (unique, one store per owner), not slug -- upserting
    # on slug would let a slug collision silently reassign a *different*
    # owner's store to this user instead of failing.
    store = (
        supabase.table("stores")
        .upsert(
            {"owner_id": user_id, "name": store_name, "slug": store_slug},
            on_conflict="owner_id",
        )
        .execute()
        .data[0]
    )

    return {"user_id": user_id, "store": store}
