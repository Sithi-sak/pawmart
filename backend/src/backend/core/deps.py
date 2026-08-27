from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase import get_supabase

bearer_scheme = HTTPBearer()


@dataclass
class CurrentCustomer:
    id: str
    email: str | None
    role: str


def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),  # noqa: B008
) -> CurrentCustomer:
    supabase = get_supabase()
    token = credentials.credentials

    try:
        user = supabase.auth.get_user(token).user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session"
        ) from exc

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    customer = (
        supabase.table("customers").select("role").eq("id", user.id).single().execute().data
    )
    if customer is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No customer profile")

    return CurrentCustomer(id=user.id, email=user.email, role=customer["role"])


def require_admin(
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> CurrentCustomer:
    if customer.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return customer


def _require_active_store(customer_id: str) -> None:
    supabase = get_supabase()
    store = (
        supabase.table("stores")
        .select("status")
        .eq("owner_id", customer_id)
        .maybe_single()
        .execute()
        .data
    )
    if store is None or store["status"] != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store is banned")


def require_store_owner(
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> CurrentCustomer:
    if customer.role != "store_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Store owner access required"
        )
    _require_active_store(customer.id)
    return customer


def require_admin_or_store_owner(
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> CurrentCustomer:
    if customer.role not in ("admin", "store_owner"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin or store owner access required"
        )
    if customer.role == "store_owner":
        _require_active_store(customer.id)
    return customer
