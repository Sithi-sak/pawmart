"""Provision 6 demo store owners + their stores for local marketplace seeding.

Reuses provision_store_owner (same as create_store_owner.py's single-store
path) in a loop. Safe to rerun: each store is upserted by owner_id, and an
existing auth user for the same email is reused rather than recreated.

All 6 use the same password for convenience -- these are local demo
accounts, not real seller credentials.

After this script runs (so the `stores` rows it creates exist), apply
supabase/migrations/20260829000000_seed_demo_marketplace_products.sql,
which seeds products into these stores by slug -- same ordering dependency
as the pawmart-flagship bootstrap (see CHECKPOINT.md task 3.10.2).

Usage:
    uv run python scripts/seed_demo_stores.py <password>
"""

import sys

from backend.core.supabase import get_supabase
from backend.services.store_owner import provision_store_owner

STORES = [
    {
        "email": "pisey@pawmartsellers.demo",
        "full_name": "Sok Pisey",
        "store_name": "Mekong Aqua & Aviary",
        "store_slug": "mekong-aqua-aviary",
    },
    {
        "email": "sreymom@pawmartsellers.demo",
        "full_name": "Chan Sreymom",
        "store_name": "BKK1 Pet Boutique",
        "store_slug": "bkk1-pet-boutique",
    },
    {
        "email": "vibol@pawmartsellers.demo",
        "full_name": "Heng Vibol",
        "store_name": "Toul Kork Paw Pantry",
        "store_slug": "toul-kork-paw-pantry",
    },
    {
        "email": "dara@pawmartsellers.demo",
        "full_name": "Ly Dara",
        "store_name": "Bassac Vet Supply",
        "store_slug": "bassac-vet-supply",
    },
    {
        "email": "sophal@pawmartsellers.demo",
        "full_name": "Prum Sophal",
        "store_name": "Sen Sok Pet Barn",
        "store_slug": "sen-sok-pet-barn",
    },
    {
        "email": "chanthy@pawmartsellers.demo",
        "full_name": "Meas Chanthy",
        "store_name": "Angkor Paws",
        "store_slug": "angkor-paws",
    },
]


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <password>")
        raise SystemExit(1)

    password = sys.argv[1]
    supabase = get_supabase()

    for entry in STORES:
        result = provision_store_owner(
            supabase,
            email=entry["email"],
            password=password,
            full_name=entry["full_name"],
            store_name=entry["store_name"],
            store_slug=entry["store_slug"],
        )
        print(f"store owner ready: user={result['user_id']} store={result['store']['slug']}")


if __name__ == "__main__":
    main()
