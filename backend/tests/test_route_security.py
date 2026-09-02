"""5.8 security spot-checks: the admin/store-owner-only backend routes.

test_deps.py (5.1) already proves require_admin/require_store_owner/
require_admin_or_store_owner behave correctly as bare functions. What's
missing -- and what these tests cover -- is that each protected router
actually wires one of those dependencies into its route, by hitting the
real FastAPI app over HTTP with TestClient rather than calling the
endpoint function directly. A route that quietly lost its Depends(...)
(e.g. during a refactor) would pass every other existing test but fail
these.
"""

from typing import ClassVar

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(fake_supabase, token: str, *, role: str, id: str = "user-1"):
    fake_supabase.auth.register_user(token, id=id, email=f"{id}@gmail.com")
    rows = fake_supabase._tables.setdefault("customers", [])
    rows.append({"id": id, "role": role})


class TestOrderStatusRoute:
    """PATCH /api/orders/{id}/status is require_store_owner-only -- not
    even admin gets a bypass here (see 5.7 / 3.10.9 narrowing notes)."""

    url = "/api/orders/1/status"
    body: ClassVar = {"status": "processing"}

    def test_no_token_is_rejected(self):
        response = client.patch(self.url, json=self.body)
        assert response.status_code in (401, 403)

    def test_plain_customer_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="customer")
        response = client.patch(self.url, json=self.body, headers=_auth("tok"))
        assert response.status_code == 403

    def test_admin_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="admin")
        response = client.patch(self.url, json=self.body, headers=_auth("tok"))
        assert response.status_code == 403

    def test_store_owner_passes_the_guard(self, fake_supabase, monkeypatch):
        _register(fake_supabase, "tok", role="store_owner")
        fake_supabase.seed("stores", [{"owner_id": "user-1", "status": "active"}])
        monkeypatch.setattr("backend.routers.orders.get_supabase", lambda: fake_supabase)

        response = client.patch(self.url, json=self.body, headers=_auth("tok"))

        # Past the guard: fails downstream on the order lookup (empty fake
        # "orders" table), never on 401/403.
        assert response.status_code == 404


class TestStorageRoutes:
    """POST/DELETE /api/storage/product-images are
    require_admin_or_store_owner-only."""

    def test_delete_by_plain_customer_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="customer")
        response = client.delete("/api/storage/product-images/some-path.jpg", headers=_auth("tok"))
        assert response.status_code == 403

    def test_upload_by_plain_customer_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="customer")
        files = {"file": ("pic.jpg", b"fake-bytes", "image/jpeg")}
        response = client.post("/api/storage/product-images", files=files, headers=_auth("tok"))
        assert response.status_code == 403

    def test_banned_store_owner_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="store_owner")
        fake_supabase.seed("stores", [{"owner_id": "user-1", "status": "banned"}])
        response = client.delete("/api/storage/product-images/some-path.jpg", headers=_auth("tok"))
        assert response.status_code == 403

    def test_no_token_is_rejected(self):
        response = client.delete("/api/storage/product-images/some-path.jpg")
        assert response.status_code in (401, 403)


class TestStoreApplicationApproveRoute:
    """POST /api/store-applications/{id}/approve is require_admin-only --
    even a store owner doesn't get to approve their own competitors."""

    url = "/api/store-applications/1/approve"
    body: ClassVar = {"store_name": "New Store", "store_slug": "new-store"}

    def test_no_token_is_rejected(self):
        response = client.post(self.url, json=self.body)
        assert response.status_code in (401, 403)

    def test_plain_customer_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="customer")
        response = client.post(self.url, json=self.body, headers=_auth("tok"))
        assert response.status_code == 403

    def test_store_owner_is_rejected(self, fake_supabase):
        _register(fake_supabase, "tok", role="store_owner")
        fake_supabase.seed("stores", [{"owner_id": "user-1", "status": "active"}])
        response = client.post(self.url, json=self.body, headers=_auth("tok"))
        assert response.status_code == 403

    def test_admin_passes_the_guard(self, fake_supabase, monkeypatch):
        _register(fake_supabase, "tok", role="admin")
        monkeypatch.setattr("backend.routers.store_applications.get_supabase", lambda: fake_supabase)

        response = client.post(self.url, json=self.body, headers=_auth("tok"))

        # Past the guard: fails downstream on the application lookup
        # (empty fake "store_applications" table), never on 401/403.
        assert response.status_code == 404
