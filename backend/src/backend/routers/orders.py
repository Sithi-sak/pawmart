import random
import string
from typing import Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..core.config import get_settings
from ..core.deps import (
    CurrentCustomer,
    get_current_customer,
    require_store_owner,
)
from ..core.supabase import get_supabase
from .loyalty import award_points_for_order

router = APIRouter(prefix="/api/orders", tags=["orders"])

SHIPPING_COSTS = {"standard": 0.0, "express": 25.0}
TAX_RATE = 0.0875
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
    # id of an unconsumed loyalty_transactions "redeem" row (see
    # AccountView's reward redemption) the customer picked to discount this
    # order with.
    redemption_id: int | None = None
    # Only present (and required) for payment_method == "visa" — the
    # PaymentIntent created by POST /payment-intent, confirmed client-side
    # with Stripe Elements before "Place Order" ever calls this endpoint.
    payment_intent_id: str | None = None


class PaymentIntentIn(BaseModel):
    items: list[OrderItemIn]
    shipping_method: Literal["standard", "express"]
    redemption_id: int | None = None


class OrderStatusUpdateIn(BaseModel):
    status: Literal["confirmed", "processing", "shipping", "out_for_delivery", "delivered"]


def _generate_order_number() -> str:
    return "PM-" + "".join(random.choices(string.digits, k=6))


def _owned_store_id(supabase, owner_id: str) -> int | None:
    store = (
        supabase.table("stores")
        .select("id")
        .eq("owner_id", owner_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
        .data
    )
    return store["id"] if store else None


def _load_unconsumed_redemption(supabase, redemption_id: int, customer_id: str) -> dict:
    redemption = (
        supabase.table("loyalty_transactions")
        .select("id, customer_id, order_id, reward_id, loyalty_rewards(discount_amount, free_shipping)")
        .eq("id", redemption_id)
        .eq("type", "redeem")
        .maybe_single()
        .execute()
        .data
    )
    if (
        redemption is None
        or redemption["customer_id"] != customer_id
        or redemption["order_id"] is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reward has already been used or does not belong to you",
        )
    return redemption


def _price_cart(
    supabase,
    items: list[OrderItemIn],
    shipping_method: str,
    customer_id: str,
    redemption_id: int | None,
) -> dict:
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    product_ids = [item.product_id for item in items]
    products = (
        supabase.table("products")
        .select("id, name, price, stock, store_id")
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

    store_ids = {p["store_id"] for p in products_by_id.values()}
    if len(store_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart items must all be from the same store",
        )
    store_id = store_ids.pop()

    # Hiding a banned store from the catalog only stops customers from
    # discovering its products -- an item added to the cart before the ban
    # can still reach checkout, so re-check status here (this call uses the
    # service-role key and bypasses the RLS gate that owns_store() enforces
    # everywhere else, see 3.10.10 notes).
    store = supabase.table("stores").select("status").eq("id", store_id).maybe_single().execute().data
    if store is None or store["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This store is no longer accepting orders",
        )

    line_items = []
    subtotal = 0.0
    for item in items:
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
    free_shipping = False
    if redemption_id is not None:
        redemption = _load_unconsumed_redemption(supabase, redemption_id, customer_id)
        reward = redemption["loyalty_rewards"]
        discount = min(float(reward["discount_amount"] or 0), subtotal)
        free_shipping = reward["free_shipping"]

    shipping_cost = 0.0 if free_shipping else SHIPPING_COSTS[shipping_method]
    tax = round((subtotal - discount + shipping_cost) * TAX_RATE, 2)
    total = round(subtotal - discount + shipping_cost + tax, 2)

    return {
        "store_id": store_id,
        "products_by_id": products_by_id,
        "line_items": line_items,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "shipping_cost": shipping_cost,
        "tax": tax,
        "total": total,
        "redemption_id": redemption_id,
    }


def _attach_item_images(supabase, items: list[dict]) -> list[dict]:
    """Add the product's first catalog image to each order item.

    order_items snapshots name/price at purchase time but not the image, so
    the tracking page would otherwise only have a grey placeholder to show.
    """
    product_ids = [i["product_id"] for i in items if i.get("product_id") is not None]
    images_by_product: dict[int, str | None] = {}
    if product_ids:
        products = (
            supabase.table("products").select("id, images").in_("id", product_ids).execute().data
        )
        for product in products:
            images = product.get("images") or []
            images_by_product[product["id"]] = images[0] if images else None

    return [{**i, "image_url": images_by_product.get(i.get("product_id"))} for i in items]


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
    return {**order, "items": _attach_item_images(supabase, items), "status_history": history}


@router.post("/payment-intent")
def create_payment_intent(
    payload: PaymentIntentIn,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    pricing = _price_cart(
        supabase, payload.items, payload.shipping_method, customer.id, payload.redemption_id
    )

    stripe.api_key = get_settings().stripe_secret_key
    intent = stripe.PaymentIntent.create(
        amount=round(pricing["total"] * 100),
        currency="usd",
        payment_method_types=["card"],
        metadata={"customer_id": customer.id},
    )
    return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreateIn,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    pricing = _price_cart(
        supabase, payload.items, payload.shipping.method, customer.id, payload.redemption_id
    )

    if payload.payment_method == "visa":
        if not payload.payment_intent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Missing payment_intent_id"
            )
        stripe.api_key = get_settings().stripe_secret_key
        try:
            intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
        except stripe.error.StripeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment intent"
            ) from exc

        # StripeObject (stripe-python 15+) has no .get() -- only __getitem__/__contains__.
        intent_customer_id = intent.metadata["customer_id"] if "customer_id" in intent.metadata else None  # noqa: SIM401
        if intent_customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your payment")
        if intent.status != "succeeded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Payment has not succeeded"
            )
        if intent.amount != round(pricing["total"] * 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount does not match order total"
            )
        payment_status = "paid"
    else:
        # aba_payway and khqr have no real payment-gateway callback in this
        # MVP, so the order is marked paid at placement time same as a
        # verified Visa charge — see 4.1 checkpoint notes.
        payment_status = "paid"

    order_row = {
        "order_number": _generate_order_number(),
        "customer_id": customer.id,
        "store_id": pricing["store_id"],
        "shipping_full_name": payload.shipping.full_name,
        "shipping_phone": payload.shipping.phone,
        "shipping_street": payload.shipping.street,
        "shipping_city": payload.shipping.city,
        "shipping_postal_code": payload.shipping.postal_code,
        "shipping_method": payload.shipping.method,
        "shipping_cost": pricing["shipping_cost"],
        "payment_method": payload.payment_method,
        "payment_status": payment_status,
        "stripe_payment_intent_id": payload.payment_intent_id,
        "subtotal": pricing["subtotal"],
        "discount": pricing["discount"],
        "tax": pricing["tax"],
        "total": pricing["total"],
    }

    try:
        order = supabase.table("orders").insert(order_row).execute().data[0]
    except Exception as exc:
        # Unique constraint on stripe_payment_intent_id -- this PaymentIntent
        # already paid for a different order (double-submit / replay).
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This payment has already been used"
        ) from exc

    order_items_rows = [{**li, "order_id": order["id"]} for li in pricing["line_items"]]
    inserted_items = supabase.table("order_items").insert(order_items_rows).execute().data
    history = (
        supabase.table("order_status_history")
        .insert({"order_id": order["id"], "status": order["status"]})
        .execute()
        .data
    )

    for item in payload.items:
        product = pricing["products_by_id"][item.product_id]
        supabase.table("products").update({"stock": product["stock"] - item.quantity}).eq(
            "id", item.product_id
        ).execute()

    if pricing["redemption_id"] is not None:
        supabase.table("loyalty_transactions").update({"order_id": order["id"]}).eq(
            "id", pricing["redemption_id"]
        ).execute()

    award_points_for_order(supabase, customer.id, order)

    return {
        **order,
        "items": _attach_item_images(supabase, inserted_items),
        "status_history": history,
    }


@router.get("")
def list_orders(
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> list[dict]:
    supabase = get_supabase()
    is_store_owner_caller = customer.role == "store_owner"

    query = supabase.table("orders").select("*").order("created_at", desc=True)
    if is_store_owner_caller:
        store_id = _owned_store_id(supabase, customer.id)
        query = query.eq("store_id", store_id if store_id is not None else -1)
    else:
        # Admin has no blanket order visibility here (checkpoint 3.10.9) --
        # scoped to their own orders same as a plain customer.
        query = query.eq("customer_id", customer.id)
    orders = query.execute().data

    order_ids = [o["id"] for o in orders]
    items = (
        supabase.table("order_items").select("order_id, quantity").in_("order_id", order_ids).execute().data
        if order_ids
        else []
    )
    item_counts: dict[int, int] = {}
    for item in items:
        item_counts[item["order_id"]] = item_counts.get(item["order_id"], 0) + item["quantity"]

    show_customer_info = is_store_owner_caller
    customers_by_id: dict[str, dict] = {}
    if show_customer_info and orders:
        customer_ids = list({o["customer_id"] for o in orders})
        customer_rows = (
            supabase.table("customers")
            .select("id, full_name, email")
            .in_("id", customer_ids)
            .execute()
            .data
        )
        customers_by_id = {c["id"]: c for c in customer_rows}

    return [
        {
            **o,
            "item_count": item_counts.get(o["id"], 0),
            **({"customer": customers_by_id.get(o["customer_id"])} if show_customer_info else {}),
        }
        for o in orders
    ]


@router.get("/{order_id}")
def get_order(
    order_id: int,
    customer: CurrentCustomer = Depends(get_current_customer),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    order = _load_order(supabase, order_id)
    if order["customer_id"] == customer.id:
        return order
    if customer.role == "store_owner" and order["store_id"] == _owned_store_id(
        supabase, customer.id
    ):
        return order
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateIn,
    staff: CurrentCustomer = Depends(require_store_owner),  # noqa: B008
) -> dict:
    supabase = get_supabase()
    order = _load_order(supabase, order_id)

    if order["store_id"] != _owned_store_id(supabase, staff.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your store's order")

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
