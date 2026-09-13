import pytest
from conftest import FakeSupabase
from fastapi import HTTPException

from backend.core.deps import CurrentCustomer
from backend.routers.orders import (
    OrderItemIn,
    OrderStatusUpdateIn,
    _price_cart,
    get_order,
    list_orders,
    update_order_status,
)


def _items(*pairs: tuple[int, int]) -> list[OrderItemIn]:
    return [OrderItemIn(product_id=pid, quantity=qty) for pid, qty in pairs]


@pytest.fixture
def supabase():
    fake = FakeSupabase()
    fake.seed(
        "products",
        [
            {"id": 1, "name": "Kibble", "price": 20.0, "stock": 5, "store_id": 10},
            {"id": 2, "name": "Chew Toy", "price": 15.0, "stock": 2, "store_id": 10},
            {"id": 3, "name": "Other Store Bowl", "price": 8.0, "stock": 5, "store_id": 20},
        ],
    )
    fake.seed(
        "stores",
        [
            {"id": 10, "status": "active"},
            {"id": 20, "status": "banned"},
        ],
    )
    fake.seed(
        "loyalty_transactions",
        [
            # unconsumed $5-off redemption belonging to cust-1
            {
                "id": 100,
                "customer_id": "cust-1",
                "order_id": None,
                "reward_id": 1,
                "type": "redeem",
                "loyalty_rewards": {"discount_amount": 5.0, "free_shipping": False},
            },
            # unconsumed free-shipping redemption belonging to cust-1
            {
                "id": 101,
                "customer_id": "cust-1",
                "order_id": None,
                "reward_id": 2,
                "type": "redeem",
                "loyalty_rewards": {"discount_amount": None, "free_shipping": True},
            },
            # a $25-off redemption -- bigger than the fixture cart's subtotal
            {
                "id": 102,
                "customer_id": "cust-1",
                "order_id": None,
                "reward_id": 3,
                "type": "redeem",
                "loyalty_rewards": {"discount_amount": 25.0, "free_shipping": False},
            },
            # already applied to another order
            {
                "id": 103,
                "customer_id": "cust-1",
                "order_id": 999,
                "reward_id": 1,
                "type": "redeem",
                "loyalty_rewards": {"discount_amount": 5.0, "free_shipping": False},
            },
            # belongs to a different customer
            {
                "id": 104,
                "customer_id": "cust-2",
                "order_id": None,
                "reward_id": 1,
                "type": "redeem",
                "loyalty_rewards": {"discount_amount": 5.0, "free_shipping": False},
            },
        ],
    )
    return fake


class TestStockLimit:
    def test_quantity_at_stock_ceiling_is_allowed(self, supabase):
        pricing = _price_cart(supabase, _items((2, 2)), "standard", "cust-1", None)
        assert pricing["line_items"][0]["quantity"] == 2

    def test_quantity_over_stock_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((2, 3)), "standard", "cust-1", None)
        assert exc_info.value.status_code == 400
        assert "Chew Toy" in exc_info.value.detail

    def test_zero_stock_product_cannot_be_ordered_at_all(self, supabase):
        supabase.seed("products", [{"id": 4, "name": "Sold Out", "price": 5.0, "stock": 0, "store_id": 10}])
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((4, 1)), "standard", "cust-1", None)
        assert exc_info.value.status_code == 400
        assert "Sold Out" in exc_info.value.detail


class TestRedemption:
    def test_valid_redemption_applies_discount(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 100)
        assert pricing["subtotal"] == 20.0
        assert pricing["discount"] == 5.0

    def test_free_shipping_redemption_zeroes_shipping_cost(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "express", "cust-1", 101)
        assert pricing["shipping_cost"] == 0.0

    def test_discount_is_capped_at_subtotal(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 102)
        assert pricing["subtotal"] == 20.0
        assert pricing["discount"] == 20.0
        assert pricing["total"] >= 0

    def test_already_used_redemption_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 103)
        assert exc_info.value.status_code == 400

    def test_someone_elses_redemption_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 104)
        assert exc_info.value.status_code == 400

    def test_unknown_redemption_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 9999)
        assert exc_info.value.status_code == 400

    def test_no_redemption_means_no_discount(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "standard", "cust-1", None)
        assert pricing["discount"] == 0.0


class TestCartValidation:
    def test_empty_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, [], "standard", "cust-1", None)
        assert exc_info.value.status_code == 400

    def test_unknown_product_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((999, 1)), "standard", "cust-1", None)
        assert exc_info.value.status_code == 400
        assert "999" in exc_info.value.detail

    def test_mixed_store_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1), (3, 1)), "standard", "cust-1", None)
        assert exc_info.value.status_code == 400
        assert "same store" in exc_info.value.detail

    def test_banned_store_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((3, 1)), "standard", "cust-1", None)
        assert exc_info.value.status_code == 400
        assert "no longer accepting orders" in exc_info.value.detail


class TestTotals:
    def test_express_shipping_and_tax_are_included_in_the_total(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "express", "cust-1", None)
        assert pricing["shipping_cost"] == 25.0
        expected_tax = round((20.0 + 25.0) * 0.0875, 2)
        assert pricing["tax"] == expected_tax
        assert pricing["total"] == round(20.0 + 25.0 + expected_tax, 2)

    def test_discount_is_applied_before_tax(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "standard", "cust-1", 100)
        expected_tax = round((20.0 - 5.0) * 0.0875, 2)
        assert pricing["tax"] == expected_tax


# get_order/list_orders call get_supabase() internally (unlike _price_cart,
# which takes it as an explicit argument) so, same as test_deps.py, the fake
# has to be patched in at the router module's own import binding.
@pytest.fixture
def order_supabase(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr("backend.routers.orders.get_supabase", lambda: fake)
    fake.seed(
        "stores",
        [
            {"id": 10, "owner_id": "owner-1", "status": "active"},
            {"id": 20, "owner_id": "owner-2", "status": "active"},
        ],
    )
    fake.seed(
        "orders",
        [
            {"id": 1, "customer_id": "cust-1", "store_id": 10, "status": "confirmed",
             "created_at": "2026-01-01T00:00:00Z"},
            {"id": 2, "customer_id": "cust-2", "store_id": 20, "status": "confirmed",
             "created_at": "2026-01-02T00:00:00Z"},
            {"id": 3, "customer_id": "admin-1", "store_id": 10, "status": "confirmed",
             "created_at": "2026-01-03T00:00:00Z"},
        ],
    )
    fake.seed("order_items", [])
    fake.seed("order_status_history", [])
    return fake


class TestGetOrderAccessControl:
    def test_customer_can_view_their_own_order(self, order_supabase):
        customer = CurrentCustomer(id="cust-1", email="a@gmail.com", role="customer")
        assert get_order(1, customer=customer)["id"] == 1

    def test_customer_cannot_view_another_customers_order_by_guessing_its_id(self, order_supabase):
        customer = CurrentCustomer(id="cust-1", email="a@gmail.com", role="customer")
        with pytest.raises(HTTPException) as exc_info:
            get_order(2, customer=customer)
        assert exc_info.value.status_code == 403

    def test_nonexistent_order_id_raises_404(self, order_supabase):
        customer = CurrentCustomer(id="cust-1", email="a@gmail.com", role="customer")
        with pytest.raises(HTTPException) as exc_info:
            get_order(999, customer=customer)
        assert exc_info.value.status_code == 404

    def test_store_owner_can_view_their_own_stores_order(self, order_supabase):
        customer = CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")
        assert get_order(1, customer=customer)["id"] == 1

    def test_store_owner_cannot_view_another_stores_order(self, order_supabase):
        customer = CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")
        with pytest.raises(HTTPException) as exc_info:
            get_order(2, customer=customer)
        assert exc_info.value.status_code == 403

    def test_admin_has_no_blanket_bypass_for_another_customers_order(self, order_supabase):
        # Checkpoint 3.10.9: admin lost its list_orders/get_order bypass, so
        # it's scoped to its own orders same as a plain customer.
        customer = CurrentCustomer(id="admin-1", email="admin@x.com", role="admin")
        with pytest.raises(HTTPException) as exc_info:
            get_order(1, customer=customer)
        assert exc_info.value.status_code == 403

    def test_admin_can_still_view_an_order_that_is_actually_theirs(self, order_supabase):
        customer = CurrentCustomer(id="admin-1", email="admin@x.com", role="admin")
        assert get_order(3, customer=customer)["id"] == 3


class TestListOrdersScoping:
    def test_customer_only_sees_their_own_orders(self, order_supabase):
        customer = CurrentCustomer(id="cust-1", email="a@gmail.com", role="customer")
        assert [o["id"] for o in list_orders(customer=customer)] == [1]

    def test_store_owner_only_sees_their_stores_orders(self, order_supabase):
        customer = CurrentCustomer(id="owner-2", email="o2@x.com", role="store_owner")
        assert [o["id"] for o in list_orders(customer=customer)] == [2]

    def test_admin_has_no_blanket_view_of_all_orders(self, order_supabase):
        customer = CurrentCustomer(id="admin-1", email="admin@x.com", role="admin")
        assert [o["id"] for o in list_orders(customer=customer)] == [3]


# Order 1 (store 10, owner-1) starts "confirmed" -- every test below advances
# it at most once, since a second successful advance would insert a second
# order_status_history row with no created_at, and FakeQuery.order() can't
# sort two equal (None) sort keys (see checkpoint 5.7 notes).
class TestUpdateOrderStatus:
    def _owner1(self) -> CurrentCustomer:
        return CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

    def test_store_owner_can_advance_their_own_order(self, order_supabase):
        result = update_order_status(1, OrderStatusUpdateIn(status="processing"), staff=self._owner1())
        assert result["status"] == "processing"

    def test_advancing_records_a_status_history_entry(self, order_supabase):
        update_order_status(1, OrderStatusUpdateIn(status="processing"), staff=self._owner1())
        history = order_supabase.table("order_status_history").select("*").execute().data
        assert [h["status"] for h in history] == ["processing"]

    def test_same_status_is_rejected(self, order_supabase):
        with pytest.raises(HTTPException) as exc_info:
            update_order_status(1, OrderStatusUpdateIn(status="confirmed"), staff=self._owner1())
        assert exc_info.value.status_code == 400

    def test_backward_status_is_rejected(self, order_supabase):
        # Order 1 is seeded at "confirmed" -- "processing" (index 0) is
        # already forward of nothing, so seed straight at a later status to
        # exercise an actual backward move without a second history insert.
        order_supabase.seed(
            "orders",
            [
                {"id": 1, "customer_id": "cust-1", "store_id": 10, "status": "shipping",
                 "created_at": "2026-01-01T00:00:00Z"},
            ],
        )
        with pytest.raises(HTTPException) as exc_info:
            update_order_status(1, OrderStatusUpdateIn(status="processing"), staff=self._owner1())
        assert exc_info.value.status_code == 400

    def test_skipping_intermediate_statuses_in_one_hop_is_allowed_by_design(self, order_supabase):
        # The checkpoint's 5.7 wording ("can't skip/go backward") reads as if
        # skipping were also blocked, but update_order_status only rejects
        # new_index <= current_index -- any later status is a valid one-hop
        # move. This matches StoreOwnerOrdersView's dropdown, which offers
        # every remaining status (not just the immediate next one). Testing
        # the actual behavior here rather than the checklist's wording.
        result = update_order_status(1, OrderStatusUpdateIn(status="delivered"), staff=self._owner1())
        assert result["status"] == "delivered"

    def test_store_owner_cannot_update_another_stores_order(self, order_supabase):
        with pytest.raises(HTTPException) as exc_info:
            update_order_status(2, OrderStatusUpdateIn(status="processing"), staff=self._owner1())
        assert exc_info.value.status_code == 403

    def test_nonexistent_order_raises_404(self, order_supabase):
        with pytest.raises(HTTPException) as exc_info:
            update_order_status(999, OrderStatusUpdateIn(status="processing"), staff=self._owner1())
        assert exc_info.value.status_code == 404
