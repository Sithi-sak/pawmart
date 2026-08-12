from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError
from pydantic import BaseModel

from ..core.deps import CurrentCustomer, require_admin
from ..core.supabase import get_supabase
from ..services.store_owner import generate_temp_password, provision_store_owner

router = APIRouter(prefix="/api/store-applications", tags=["store-applications"])

# Submitting a request (public) and rejecting one just need RLS-scoped
# reads/writes on store_applications, same pattern as the rest of the admin
# CRUD in this app (see 3.7 checkpoint notes) -- both go straight through
# Supabase from the frontend. Approval is the one operation that needs the
# backend: creating the auth.users row requires the service-role key.


class StoreApplicationApproveIn(BaseModel):
    store_name: str
    store_slug: str


@router.post("/{application_id}/approve")
def approve_store_application(
    application_id: int,
    payload: StoreApplicationApproveIn,
    admin: CurrentCustomer = Depends(require_admin),  # noqa: B008
) -> dict:
    supabase = get_supabase()

    application = (
        supabase.table("store_applications")
        .select("*")
        .eq("id", application_id)
        .maybe_single()
        .execute()
        .data
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if application["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Application already reviewed"
        )

    temp_password = generate_temp_password()

    try:
        result = provision_store_owner(
            supabase,
            email=application["email"],
            password=temp_password,
            full_name=application["contact_name"],
            store_name=payload.store_name,
            store_slug=payload.store_slug,
        )
    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That store slug is already taken -- choose a different one.",
        ) from exc

    supabase.table("store_applications").update(
        {
            "status": "approved",
            "reviewed_by": admin.id,
            "reviewed_at": datetime.now(UTC).isoformat(),
            "created_store_id": result["store"]["id"],
        }
    ).eq("id", application_id).execute()

    return {
        "user_id": result["user_id"],
        "store": result["store"],
        "email": application["email"],
        "temp_password": temp_password,
    }
