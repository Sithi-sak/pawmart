from fastapi import APIRouter, Depends, HTTPException, status

from ..core.deps import CurrentCustomer, get_current_customer
from ..core.supabase import get_supabase

router = APIRouter(prefix="/api/loyalty", tags=["loyalty"])

# "5 Points Per $1 Spent" shown in Account; mirrored in the frontend
# checkout summary for a pre-order estimate (see orders.py's SHIPPING_COSTS
# for the same duplication pattern between backend and frontend).
POINTS_PER_DOLLAR = 5


def award_points_for_order(supabase, customer_id: str, order: dict) -> None:
    """Credit loyalty points for a paid order. No-op if payment_status isn't
    "paid" (defensive — every payment method reaches "paid" at placement
    time today, see 4.1 checkpoint notes)."""
    if order["payment_status"] != "paid":
        return

    points = int((float(order["subtotal"]) - float(order["discount"])) * POINTS_PER_DOLLAR)
    if points <= 0:
        return

    supabase.table("loyalty_transactions").insert(
        {"customer_id": customer_id, "order_id": order["id"], "points": points, "type": "earn"}
    ).execute()

    customer = (
        supabase.table("customers")
        .select("loyalty_points_balance")
        .eq("id", customer_id)
        .single()
        .execute()
        .data
    )
    new_balance = customer["loyalty_points_balance"] + points
    supabase.table("customers").update({"loyalty_points_balance": new_balance}).eq(
        "id", customer_id
    ).execute()


@router.post("/redeem/{reward_id}", status_code=status.HTTP_201_CREATED)
def redeem_reward(
    reward_id: int,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    supabase = get_supabase()

    reward = (
        supabase.table("loyalty_rewards")
        .select("*")
        .eq("id", reward_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
        .data
    )
    if reward is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found")

    customer_row = (
        supabase.table("customers")
        .select("loyalty_points_balance")
        .eq("id", customer.id)
        .single()
        .execute()
        .data
    )
    balance = customer_row["loyalty_points_balance"]
    if balance < reward["points_cost"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough points for this reward"
        )

    new_balance = balance - reward["points_cost"]
    supabase.table("customers").update({"loyalty_points_balance": new_balance}).eq(
        "id", customer.id
    ).execute()
    transaction = (
        supabase.table("loyalty_transactions")
        .insert(
            {
                "customer_id": customer.id,
                "reward_id": reward_id,
                "points": -reward["points_cost"],
                "type": "redeem",
            }
        )
        .execute()
        .data[0]
    )

    return {"balance": new_balance, "transaction": transaction}
