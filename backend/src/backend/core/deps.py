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
