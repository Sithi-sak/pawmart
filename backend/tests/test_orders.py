import pytest
from fastapi import HTTPException

from backend.routers.orders import OrderItemIn, _price_cart
from conftest import FakeSupabase


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
    return fake


class TestStockLimit:
    def test_quantity_at_stock_ceiling_is_allowed(self, supabase):
        pricing = _price_cart(supabase, _items((2, 2)), None, "standard")
        assert pricing["line_items"][0]["quantity"] == 2

    def test_quantity_over_stock_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((2, 3)), None, "standard")
        assert exc_info.value.status_code == 400
        assert "Chew Toy" in exc_info.value.detail

    def test_zero_stock_product_cannot_be_ordered_at_all(self, supabase):
        supabase.seed("products", [{"id": 4, "name": "Sold Out", "price": 5.0, "stock": 0, "store_id": 10}])
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((4, 1)), None, "standard")
        assert exc_info.value.status_code == 400
        assert "Sold Out" in exc_info.value.detail


class TestVoucher:
    def test_valid_voucher_applies_discount(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "pawmart10", "standard")
        assert pricing["subtotal"] == 20.0
        assert pricing["discount"] == 2.0

    def test_second_valid_voucher_uses_its_own_rate(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "WELCOME15", "standard")
        assert pricing["discount"] == 3.0

    def test_invalid_voucher_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1)), "NOTREAL", "standard")
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid voucher code"

    def test_no_voucher_means_no_discount(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), None, "standard")
        assert pricing["discount"] == 0.0


class TestCartValidation:
    def test_empty_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, [], None, "standard")
        assert exc_info.value.status_code == 400

    def test_unknown_product_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((999, 1)), None, "standard")
        assert exc_info.value.status_code == 400
        assert "999" in exc_info.value.detail

    def test_mixed_store_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((1, 1), (3, 1)), None, "standard")
        assert exc_info.value.status_code == 400
        assert "same store" in exc_info.value.detail

    def test_banned_store_cart_is_rejected(self, supabase):
        with pytest.raises(HTTPException) as exc_info:
            _price_cart(supabase, _items((3, 1)), None, "standard")
        assert exc_info.value.status_code == 400
        assert "no longer accepting orders" in exc_info.value.detail


class TestTotals:
    def test_express_shipping_and_tax_are_included_in_the_total(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), None, "express")
        assert pricing["shipping_cost"] == 25.0
        expected_tax = round((20.0 + 25.0) * 0.0875, 2)
        assert pricing["tax"] == expected_tax
        assert pricing["total"] == round(20.0 + 25.0 + expected_tax, 2)

    def test_discount_is_applied_before_tax(self, supabase):
        pricing = _price_cart(supabase, _items((1, 1)), "PAWMART10", "standard")
        expected_tax = round((20.0 - 2.0) * 0.0875, 2)
        assert pricing["tax"] == expected_tax
