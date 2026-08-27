import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from backend.core import deps


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class TestGetCurrentCustomer:
    def test_valid_token_returns_customer(self, fake_supabase):
        fake_supabase.auth.register_user("tok-1", id="user-1", email="a@gmail.com")
        fake_supabase.seed("customers", [{"id": "user-1", "role": "customer"}])

        customer = deps.get_current_customer(credentials=_creds("tok-1"))

        assert customer.id == "user-1"
        assert customer.email == "a@gmail.com"
        assert customer.role == "customer"

    def test_invalid_token_raises_401(self, fake_supabase):
        with pytest.raises(HTTPException) as exc_info:
            deps.get_current_customer(credentials=_creds("bad-token"))
        assert exc_info.value.status_code == 401

    def test_token_resolves_to_no_user_raises_401(self, fake_supabase):
        fake_supabase.auth.register_invalid_user("expired-tok")
        with pytest.raises(HTTPException) as exc_info:
            deps.get_current_customer(credentials=_creds("expired-tok"))
        assert exc_info.value.status_code == 401

    def test_no_customer_row_raises_403(self, fake_supabase):
        fake_supabase.auth.register_user("tok-2", id="user-2", email="b@gmail.com")
        # No row seeded in "customers" for user-2.

        with pytest.raises(HTTPException) as exc_info:
            deps.get_current_customer(credentials=_creds("tok-2"))
        assert exc_info.value.status_code == 403


class TestRequireAdmin:
    def test_admin_passes(self):
        customer = deps.CurrentCustomer(id="u1", email="a@x.com", role="admin")
        assert deps.require_admin(customer=customer) is customer

    def test_non_admin_raises_403(self):
        customer = deps.CurrentCustomer(id="u1", email="a@x.com", role="customer")
        with pytest.raises(HTTPException) as exc_info:
            deps.require_admin(customer=customer)
        assert exc_info.value.status_code == 403


class TestRequireStoreOwner:
    def test_active_store_owner_passes(self, fake_supabase):
        fake_supabase.seed("stores", [{"owner_id": "owner-1", "status": "active"}])
        customer = deps.CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

        assert deps.require_store_owner(customer=customer) is customer

    def test_banned_store_raises_403(self, fake_supabase):
        fake_supabase.seed("stores", [{"owner_id": "owner-1", "status": "banned"}])
        customer = deps.CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

        with pytest.raises(HTTPException) as exc_info:
            deps.require_store_owner(customer=customer)
        assert exc_info.value.status_code == 403

    def test_no_store_row_raises_403(self, fake_supabase):
        customer = deps.CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

        with pytest.raises(HTTPException) as exc_info:
            deps.require_store_owner(customer=customer)
        assert exc_info.value.status_code == 403

    def test_non_store_owner_raises_403(self, fake_supabase):
        customer = deps.CurrentCustomer(id="u1", email="a@x.com", role="customer")

        with pytest.raises(HTTPException) as exc_info:
            deps.require_store_owner(customer=customer)
        assert exc_info.value.status_code == 403


class TestRequireAdminOrStoreOwner:
    def test_admin_passes_without_store_check(self, fake_supabase):
        # No stores seeded at all -- admin has no store of their own, and
        # shouldn't need one to pass this dependency.
        customer = deps.CurrentCustomer(id="admin-1", email="a@x.com", role="admin")

        assert deps.require_admin_or_store_owner(customer=customer) is customer

    def test_active_store_owner_passes(self, fake_supabase):
        fake_supabase.seed("stores", [{"owner_id": "owner-1", "status": "active"}])
        customer = deps.CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

        assert deps.require_admin_or_store_owner(customer=customer) is customer

    def test_banned_store_owner_raises_403(self, fake_supabase):
        fake_supabase.seed("stores", [{"owner_id": "owner-1", "status": "banned"}])
        customer = deps.CurrentCustomer(id="owner-1", email="o@x.com", role="store_owner")

        with pytest.raises(HTTPException) as exc_info:
            deps.require_admin_or_store_owner(customer=customer)
        assert exc_info.value.status_code == 403

    def test_plain_customer_raises_403(self, fake_supabase):
        customer = deps.CurrentCustomer(id="u1", email="a@x.com", role="customer")

        with pytest.raises(HTTPException) as exc_info:
            deps.require_admin_or_store_owner(customer=customer)
        assert exc_info.value.status_code == 403
