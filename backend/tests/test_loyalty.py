import pytest
from conftest import FakeSupabase
from fastapi import HTTPException

from backend.core.deps import CurrentCustomer
from backend.routers.loyalty import award_points_for_order, redeem_reward


def _order(**overrides) -> dict:
    order = {"id": 1, "payment_status": "paid", "subtotal": 20.0, "discount": 0.0}
    order.update(overrides)
    return order


def _customer(id: str = "cust-1") -> CurrentCustomer:
    return CurrentCustomer(id=id, email="a@gmail.com", role="customer")


@pytest.fixture
def supabase():
    fake = FakeSupabase()
    fake.seed("customers", [{"id": "cust-1", "loyalty_points_balance": 100}])
    fake.seed("loyalty_transactions", [])
    return fake


class TestAwardPointsForOrder:
    def test_paid_order_credits_points_and_updates_balance(self, supabase):
        award_points_for_order(supabase, "cust-1", _order(subtotal=20.0, discount=0.0))

        txns = supabase.table("loyalty_transactions").select("*").execute().data
        assert txns == [{"customer_id": "cust-1", "order_id": 1, "points": 100, "type": "earn"}]
        customer = supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        assert customer["loyalty_points_balance"] == 200  # 100 existing + 100 earned

    def test_discount_is_subtracted_before_awarding_points(self, supabase):
        award_points_for_order(supabase, "cust-1", _order(subtotal=20.0, discount=2.0))

        customer = supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        assert customer["loyalty_points_balance"] == 190  # 100 + (20 - 2) * 5

    def test_points_are_truncated_not_rounded(self, supabase):
        award_points_for_order(supabase, "cust-1", _order(subtotal=10.0, discount=8.81))

        # (10 - 8.81) * 5 = 5.95 -> int() truncates to 5, not rounds to 6
        customer = supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        assert customer["loyalty_points_balance"] == 105

    def test_pending_confirmation_khqr_order_earns_nothing(self, supabase):
        award_points_for_order(supabase, "cust-1", _order(payment_status="pending_confirmation"))

        assert supabase.table("loyalty_transactions").select("*").execute().data == []
        customer = supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        assert customer["loyalty_points_balance"] == 100

    def test_zero_net_total_earns_nothing(self, supabase):
        award_points_for_order(supabase, "cust-1", _order(subtotal=5.0, discount=5.0))

        assert supabase.table("loyalty_transactions").select("*").execute().data == []
        customer = supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        assert customer["loyalty_points_balance"] == 100


@pytest.fixture
def redeem_supabase(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr("backend.routers.loyalty.get_supabase", lambda: fake)
    fake.seed("customers", [{"id": "cust-1", "loyalty_points_balance": 500}])
    fake.seed(
        "loyalty_rewards",
        [
            {"id": 1, "title": "$5 Off", "points_cost": 500, "is_active": True},
            {"id": 2, "title": "Retired Reward", "points_cost": 100, "is_active": False},
        ],
    )
    fake.seed("loyalty_transactions", [])
    return fake


class TestRedeemReward:
    def test_redeeming_at_exact_balance_succeeds_and_zeroes_it_out(self, redeem_supabase):
        result = redeem_reward(1, customer=_customer())

        assert result["balance"] == 0
        assert result["transaction"]["points"] == -500
        assert result["transaction"]["type"] == "redeem"
        assert result["transaction"]["reward_id"] == 1
        customer = (
            redeem_supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        )
        assert customer["loyalty_points_balance"] == 0

    def test_insufficient_balance_is_rejected_and_balance_is_unchanged(self, redeem_supabase):
        redeem_supabase.seed("customers", [{"id": "cust-1", "loyalty_points_balance": 499}])

        with pytest.raises(HTTPException) as exc_info:
            redeem_reward(1, customer=_customer())
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Not enough points for this reward"

        customer = (
            redeem_supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        )
        assert customer["loyalty_points_balance"] == 499
        assert redeem_supabase.table("loyalty_transactions").select("*").execute().data == []

    def test_balance_never_goes_negative_across_repeated_redemptions(self, redeem_supabase):
        redeem_supabase.seed(
            "loyalty_rewards", [{"id": 3, "title": "Cheap Reward", "points_cost": 200, "is_active": True}]
        )

        redeem_reward(3, customer=_customer())  # 500 -> 300
        redeem_reward(3, customer=_customer())  # 300 -> 100

        with pytest.raises(HTTPException) as exc_info:
            redeem_reward(3, customer=_customer())  # 100 - 200 would go negative
        assert exc_info.value.status_code == 400

        customer = (
            redeem_supabase.table("customers").select("*").eq("id", "cust-1").single().execute().data
        )
        assert customer["loyalty_points_balance"] == 100

    def test_nonexistent_reward_is_404(self, redeem_supabase):
        with pytest.raises(HTTPException) as exc_info:
            redeem_reward(999, customer=_customer())
        assert exc_info.value.status_code == 404

    def test_inactive_reward_cannot_be_redeemed(self, redeem_supabase):
        with pytest.raises(HTTPException) as exc_info:
            redeem_reward(2, customer=_customer())
        assert exc_info.value.status_code == 404
