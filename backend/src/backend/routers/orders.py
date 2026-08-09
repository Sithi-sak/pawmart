import random
import string
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..core.deps import CurrentCustomer, get_current_customer, require_admin
from ..core.supabase import get_supabase

router = APIRouter(prefix="/api/orders", tags=["orders"])

SHIPPING_COSTS = {"standard": 0.0, "express": 25.0}
TAX_RATE = 0.0875
# Mirrors the mock codes the cart previously validated client-side (see 3.2 checkpoint notes).
VOUCHER_RATES = {"PAWMART10": 0.1, "WELCOME15": 0.15}
# Orders only ever move forward through these statuses (task 3.3): there is
# no courier integration, so each step is a real physical event the shop
# reports itself (packed it, handed it to the driver, driver delivered it).
ORDER_STATUSES = ["confirmed", "processing", "shipping", "out_for_delivery", "delivered"]


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class ShippingIn(BaseModel):
    full_name: str
    phone: str
    street: str
    city: str
    postal_code: str
    method: Literal["standard", "express"]


class OrderCreateIn(BaseModel):
    items: list[OrderItemIn]
    shipping: ShippingIn
    payment_method: Literal["visa", "aba_payway", "khqr"]
    voucher_code: str | None = None


class OrderStatusUpdateIn(BaseModel):
    status: Literal["confirmed", "processing", "shipping", "out_for_delivery", "delivered"]


def _generate_order_number() -> str:
    return "PM-" + "".join(random.choices(string.digits, k=6))


def _load_order(supabase, order_id: int) -> dict:
    order = (
        supabase.table("orders").select("*").eq("id", order_id).maybe_single().execute().data
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    items = supabase.table("order_items").select("*").eq("order_id", order_id).execute().data
    history = (
        supabase.table("order_status_history")
        .select("*")
        .eq("order_id", order_id)
        .order("created_at")
        .execute()
        .data
    )
    return {**order, "items": items, "status_history": history}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreateIn,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    supabase = get_supabase()

    product_ids = [item.product_id for item in payload.items]
    products = (
        supabase.table("products")
        .select("id, name, price, stock")
        .in_("id", product_ids)
        .execute()
        .data
    )
    products_by_id = {p["id"]: p for p in products}

    missing = [pid for pid in product_ids if pid not in products_by_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown product(s): {missing}"
        )

    line_items = []
    subtotal = 0.0
    for item in payload.items:
        product = products_by_id[item.product_id]
        if item.quantity > product["stock"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for '{product['name']}'",
            )
        price = float(product["price"])
        subtotal += price * item.quantity
        line_items.append(
            {
                "product_id": product["id"],
                "name": product["name"],
                "price": price,
                "quantity": item.quantity,
            }
        )

    discount = 0.0
    if payload.voucher_code:
        rate = VOUCHER_RATES.get(payload.voucher_code.strip().upper())
        if rate is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid voucher code"
            )
        discount = subtotal * rate

    shipping_cost = SHIPPING_COSTS[payload.shipping.method]
    tax = round((subtotal - discount + shipping_cost) * TAX_RATE, 2)
    total = round(subtotal - discount + shipping_cost + tax, 2)
    payment_status = "pending_confirmation" if payload.payment_method == "khqr" else "paid"

    order_row = {
        "order_number": _generate_order_number(),
        "customer_id": customer.id,
        "shipping_full_name": payload.shipping.full_name,
        "shipping_phone": payload.shipping.phone,
        "shipping_street": payload.shipping.street,
        "shipping_city": payload.shipping.city,
        "shipping_postal_code": payload.shipping.postal_code,
        "shipping_method": payload.shipping.method,
        "shipping_cost": shipping_cost,
        "payment_method": payload.payment_method,
        "payment_status": payment_status,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "tax": tax,
        "total": total,
    }

    order = supabase.table("orders").insert(order_row).execute().data[0]

    order_items_rows = [{**li, "order_id": order["id"]} for li in line_items]
    inserted_items = supabase.table("order_items").insert(order_items_rows).execute().data
    history = (
        supabase.table("order_status_history")
        .insert({"order_id": order["id"], "status": order["status"]})
        .execute()
        .data
    )

    for item in payload.items:
        product = products_by_id[item.product_id]
        supabase.table("products").update({"stock": product["stock"] - item.quantity}).eq(
            "id", item.product_id
        ).execute()

    return {**order, "items": inserted_items, "status_history": history}


@router.get("")
def list_orders(
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> list[dict]:
    supabase = get_supabase()
    orders = (
        supabase.table("orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", desc=True)
        .execute()
        .data
    )

    order_ids = [o["id"] for o in orders]
    items = (
        supabase.table("order_items").select("order_id, quantity").in_("order_id", order_ids).execute().data
        if order_ids
        else []
    )
    item_counts: dict[int, int] = {}
    for item in items:
        item_counts[item["order_id"]] = item_counts.get(item["order_id"], 0) + item["quantity"]

    return [{**o, "item_count": item_counts.get(o["id"], 0)} for o in orders]


@router.get("/{order_id}")
def get_order(
    order_id: int,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    order = _load_order(supabase, order_id)
    if order["customer_id"] != customer.id and customer.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")
    return order


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateIn,
    admin: CurrentCustomer = Depends(require_admin),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    order = _load_order(supabase, order_id)

    current_index = ORDER_STATUSES.index(order["status"])
    new_index = ORDER_STATUSES.index(payload.status)
    if new_index <= current_index:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is already at or past '{payload.status}'",
        )

    supabase.table("orders").update({"status": payload.status}).eq("id", order_id).execute()
    supabase.table("order_status_history").insert(
        {"order_id": order_id, "status": payload.status}
    ).execute()

    return _load_order(supabase, order_id)
