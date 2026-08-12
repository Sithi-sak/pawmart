# PawMart — Origin Checkpoint

**How to use this file:** This is the anchor for the whole build. Work one task at a time. When a task is done, check it off here, commit, then `/clear` context and come back to this file to pick the next unchecked task. Don't jump ahead — later tasks assume earlier ones are done.

**Order of operations:** Frontend first (static UI, mock data, no backend calls) → Backend (Supabase schema, FastAPI endpoints) → wire frontend to backend feature-by-feature → ABA/KHQR payment integration is the last task, once everything else works end-to-end.

Current state: fresh `create-vue` + FastAPI scaffolds, no pages built, no schema, no auth wired.

---

## Phase 1 — Frontend (static, mock data, Element Plus)

- [x] **1.1 Project shell** — strip Vue starter boilerplate (HelloWorld/TheWelcome/WelcomeItem/icons, counter store), set up Element Plus globally, build base layout (header/nav/footer), configure router with all routes below as empty stub pages.
- [x] **1.2 Home / Landing** (`/`) — hero banner, featured products, category links.
- [x] **1.3 Product Catalog** (`/products`) — grid with filter/search by pet type, brand, price range (mock product data).
- [x] **1.4 Product Detail** (`/products/:id`) — images, description, stock availability, add-to-cart.
- [x] **1.5 Cart** (`/cart`) — line items, quantity adjust, voucher input, totals.
- [x] **1.6 Checkout** (`/checkout`) — 3-step wizard: Shipping → Payment → Review, with a persistent order summary sidebar (KHQR is a static placeholder for now, no real generation yet). See "Checkout flow" note below for backend implications.
- [x] **1.7 Order Confirmation** (`/order/confirm`) — post-payment confirmation screen.
- [x] **1.8 Order Tracking** (`/orders/:id`) — status timeline UI (Confirmed → Processing → Shipping → Out for Delivery → Delivered).
- [x] **1.9 Login / Signup** (`/login`, `/signup`) — forms only, no auth wiring yet.
- [x] **1.10 Account** (`/account`) — profile view/edit shell.
- [x] **1.11 Pet Profiles** (`/account/pets`) — list + create/edit form (name, species, breed, age, weight, diet).
- [x] **1.12 Admin Dashboard shell** (`/admin`) — protected-route layout, sales overview + low-stock alert widgets (mock data).
- [x] **1.13 Admin Products** (`/admin/products`) — CRUD table/forms (mock data).
- [x] **1.14 Admin Orders** (`/admin/orders`) — order list + status update UI (mock data).
- [x] **1.15 Collections** (`/collections`) — category/collection landing grid (mock data), linked from nav.
- [x] **1.16 Footer legal/info pages** — About Us (`/about`), Privacy Policy (`/privacy`), Terms of Service (`/terms`), linked from footer.

## Phase 2 — Backend foundation

- [x] **2.1 FastAPI app structure** — routers, settings via pydantic-settings, CORS, Supabase client init.
- [x] **2.2 Supabase schema** — tables: products, categories, customers, pet_profiles, orders, order_items, loyalty_points/rewards; RLS policies.
- [x] **2.3 Supabase Auth wiring** — real login/signup, session handling, protected route guard on frontend (admin vs customer roles).
- [x] **2.4 Supabase Storage** — product image upload/serving.

## Phase 3 — Wire frontend ↔ backend (feature by feature)

- [x] **3.1 Product Catalog & Search** — API + connect 1.3/1.4.
- [x] **3.2 Cart & Checkout** — order creation API + connect 1.5/1.6/1.7.
- [x] **3.3 Order Tracking** — status API + connect 1.8.
- [x] **3.4 Pet Profile Management** — API + connect 1.11.
- [x] **3.5 Rule-based Product Recommendations** — species/age/purchase-history filtering logic + surface on Home/Product pages (not AI/ML — see project memory).
- [x] **3.6 Loyalty & Reward System** — points accrual/redemption API + connect to Account/Checkout.
- [x] **3.7 Admin Dashboard** — product CRUD, inventory, low-stock alerts, sales overview API + connect 1.12/1.13.
- [x] **3.8 Admin Orders** — order processing API + connect 1.14.
- [x] **3.9 Docker Compose** — full stack (frontend, backend, and any local services) runnable with one command.

## Phase 3.10 — Multi-vendor marketplace pivot

> **Scope change (2026-08-12):** "Administrator" was originally a single shop-wide role (Phases 1–3 above). Chea Bunthay confirmed the real intent is a multi-vendor marketplace: independent stores, each with its own owner account managing only their own products/orders, plus a public storefront page per store. Chea Bunthay keeps a platform-wide admin role on top of individual store owners; store creation stays admin-*approved*, not public self-signup (see below); payment stays one shared payout destination (not per-store). A cart may only contain items from one store at a time — see design notes below. See `recap_pawmart.md` for the original single-shop framing this supersedes.
>
> **Scope change (2026-08-12, later same day):** initial 3.10.2 wording assumed all future stores would be provisioned by Chea Bunthay running `create_store_owner.py` by hand — not realistic in production, since he won't be running scripts for every new vendor. Adjusted: prospective sellers submit a public request (footer "Become a Seller" link), Chea Bunthay reviews/approves or rejects from the admin side, and approval provisions the account (3.10.7/3.10.8, below). The CLI script from 3.10.2 stays, but now only as the one-time bootstrap for the pre-pivot flagship store — not the ongoing seller-onboarding path.

- [x] **3.10.1 Schema** — `stores` table, `customers.role` widened to `customer`/`store_owner`/`admin`, `owns_store()` RLS helper, nullable `products.store_id`/`orders.store_id`, RLS scoping for store owners on products/orders/order_items/order_status_history/product-image storage alongside the existing platform admin (`supabase/migrations/20260812000000_multi_vendor_stores.sql`).
- [x] **3.10.2 Bootstrap + backfill** — `backend/scripts/create_store_owner.py` (mirrors `create_admin.py`): creates the Supabase Auth user, `customers.role='store_owner'` row, and `stores` row. Run once with a fixed slug, then a follow-up migration backfills `products.store_id` for the 16 seeded products via `select id from stores where slug = '<slug>'` (deterministic, not an ad-hoc SQL editor edit) and sets `products.store_id not null`; resolve `orders.store_id` nullability at the same time.
- [ ] **3.10.3 Backend role/routes** — `core/deps.py` gains a `require_admin_or_store_owner` dependency; `routers/orders.py`: `create_order` validates all cart items share one `store_id` and stores it on the order, `list_orders`/`get_order` scope store owners to their own store's orders, `update_order_status` allows a store owner to update only their own store's orders; `routers/storage.py` upload/delete broadened from admin-only to admin-or-store-owner.
- [ ] **3.10.4 Store-owner frontend** — `lib/stores.ts` (fetch/update store), `stores/auth.ts` role widened + `isStoreOwner` + `signInAdmin` generalized to `signInStaff`, new `/store/manage`, `/store/manage/products`, `/store/manage/orders` routes + `StoreOwnerLayout.vue` + `StoreOwnerDashboardView.vue`/`StoreOwnerProductsView.vue`/`StoreOwnerOrdersView.vue` (scoped near-duplicates of the Admin equivalents).
- [ ] **3.10.5 Public storefront** — `/store/:slug` route + `StoreDetailView.vue` (store header + product grid); "Sold by {store}" link on `ProductCatalogView.vue`/`ProductDetailView.vue`.
- [ ] **3.10.6 Cart single-store constraint** — `stores/cart.ts` `CartItem` gains `storeId`/`storeName`; adding a product from a different store than what's already in the cart prompts to clear the cart first (backend `create_order` already rejects mixed-store carts as defense in depth).
- [x] **3.10.7 Seller application intake** — public `store_applications` table (contact info, proposed store name, message; RLS allows anyone to insert a fresh `pending` row, admin-only to read); footer "Become a Seller" link + `/sell` route + `BecomeSellerView.vue` form; confirmation message only, no status-check portal (`supabase/migrations/20260812020000_store_applications.sql`, `lib/storeApplications.ts`).
- [x] **3.10.8 Admin seller request review** — `/admin/store-requests` + `AdminStoreRequestsView.vue`: list requests by status, **Reject** (direct Supabase update, admin RLS) with optional note, **Approve** opens a dialog to confirm/edit the store name+slug then calls `POST /api/store-applications/{id}/approve` (`routers/store_applications.py`, needs the backend because creating the `auth.users` row needs the service-role key — reuses the same provisioning logic as 3.10.2's script, factored into `services/store_owner.py`). Approval generates a random temp password, shown once in a "copy now" dialog for Chea Bunthay to relay to the seller manually — no email-sending dependency.
- [ ] **3.10.9 Admin stores directory** — `/admin/stores`, read-only list of active stores (name, owner, product/order counts) for the platform admin; store *creation* now happens through 3.10.7/3.10.8, not this view.

## Bootstrap store owner notes (task 3.10.2)

Fixed bootstrap slug is `pawmart-flagship` (the 16 pre-pivot seeded products become this store's catalog). To provision: `uv run python scripts/create_store_owner.py <email> <password> "PawMart Flagship Store" pawmart-flagship [full_name]` from `backend/`, then apply `supabase/migrations/20260812010000_backfill_store_products.sql` — in that order, since the migration's `select id from stores where slug = 'pawmart-flagship'` needs the store row to already exist (a fresh migration can't create a real `auth.users`-backed owner on its own, same reasoning as 3.10.1). The migration backfills every pre-pivot `products`/`orders` row onto this store (there was only ever one shop before the pivot) and then sets both `store_id` columns `not null`. Neither the script nor the migration has been run yet — needs a real Supabase Auth admin call, not something to fire from an ad-hoc session; the user runs it against the actual project.

## Seller application review notes (tasks 3.10.7/3.10.8)

Two design calls made with the user and locked in: (1) credential handoff on approval is a one-time password reveal in the admin UI, not an emailed invite link — avoids taking a dependency on Supabase's email delivery being configured, which nothing else in this project currently relies on (`create_admin.py`/`create_store_owner.py` both set `email_confirm: true` and skip email entirely). Chea Bunthay copies the password and relays it to the seller himself, same human-mediated pattern as KHQR payment confirmation. (2) No applicant-facing status-check portal — submitting just shows a "thanks, we'll review and reach out" confirmation; Chea Bunthay follows up outside the app once he's decided, so there's no lookup route/UI to build for a one-time submission.

`store_applications` never stores a password — the applicant doesn't choose one. `services/store_owner.py::provision_store_owner` is shared by both the CLI bootstrap script (3.10.2) and the approval endpoint; note it upserts the `stores` row keyed on `owner_id` (unique per owner), not `slug` — upserting on slug would let an admin's slug choice silently reassign a *different* owner's existing store if it collided, whereas keying on owner_id makes a real slug collision surface as a clean 400 instead.

Submission and rejection are plain RLS-governed Supabase calls from the frontend (same "direct via RLS" pattern as the rest of admin CRUD, see 3.7 notes) — only approval goes through the backend, since only it needs the service-role key to call `auth.admin.create_user`.

## Phase 4 — Payment (final task)

- [ ] **4.1 Payments — Stripe (Visa) + KHQR / Bakong (MVP, manual verification)** — Visa card payments go through a real Stripe integration (PaymentIntent, card fields via Stripe Elements, charged when "Place Order" fires — replaces the current simulated Visa flow); KHQR: generate KHQR QR code with Chea Bunthay's ABA bank details + order total at checkout, "I have paid" button, admin manual confirm in Admin Orders. (Full ABA PayWay API automation is still out of scope for submission — see project memory.) Needs a Stripe account + API keys before build starts.

## Phase 5 — Testing (after everything else is done)

- [ ] **5.1 Auth & account** — signup/login/logout (email + Google), password reset, admin login (non-Gmail gate), session persistence across refresh, protected-route redirects for guest/customer/admin.
- [ ] **5.2 Catalog & product detail** — filter/search/sort combinations, empty-result state, product detail for in-stock/out-of-stock/no-image products, related products, recommended products (guest fallback vs personalized).
- [ ] **5.3 Cart & checkout** — quantity edit/remove, voucher valid/invalid, stock-limit edge cases, full checkout wizard for all 3 payment methods (Stripe/Visa success + declined card, ABA informational, KHQR "I Have Paid"), order confirmation reads the real created order.
- [ ] **5.4 Order tracking & history** — status timeline renders correctly at each stage, order history list/empty state, access-control check (customer can't view another customer's order by guessing an id).
- [ ] **5.5 Pet profiles & recommendations** — create/edit/delete pets, recommendations update when a pet's species changes or after a new order, guest vs signed-in behavior.
- [ ] **5.6 Loyalty & rewards** — points accrue on order, redemption flow, balance never goes negative.
- [ ] **5.7 Admin** — product CRUD (incl. image upload/remove), low-stock alerts, sales overview numbers match real orders, order status transitions (can't skip/go backward), KHQR manual payment confirmation.
- [ ] **5.8 Security / RLS spot-checks** — non-admin can't reach `/admin/*` API or UI, customers only ever see their own pets/orders/loyalty transactions via direct Supabase queries, admin-only writes rejected for a plain customer token.
- [ ] **5.9 Cross-cutting** — mobile/responsive pass on key pages, loading/error states on slow or failing network, full stack boots clean via Docker Compose (3.9) with a fresh database.

---

## Checkout flow notes (for backend, task 3.2)

`/checkout` is a single-page wizard with 3 steps, not 3 routes — step state lives client-side and the order summary sidebar persists across all steps:

1. **Shipping** — recipient name, phone, street/city/postal, shipping method (Standard/free vs Express/flat fee).
2. **Payment** — user picks one of 3 methods (Visa / ABA PayWay / KHQR), each just presenting its own inputs/info here — no action is taken yet on this step:
   - Visa → card fields via Stripe Elements (hosted, PCI-compliant — not raw inputs bound to app state) + billing-address-same-as-shipping toggle. No charge happens on this step.
   - ABA PayWay → informational only ("you'll be redirected..."); full PayWay API automation is out of scope (see project memory), so nothing to redirect to yet.
   - KHQR → informational only; the actual QR is deferred to Review (see below).
3. **Review** — read-only recap of shipping + payment method (masked for Visa), line items, then a single **"Place Order"** button in the sidebar is where the method-specific action actually fires: Visa confirms the Stripe PaymentIntent and goes to `/order/confirm` on success, or shows the decline/error and stays on Review; ABA still simulates processing and goes straight to `/order/confirm`; KHQR opens a "Scan to Pay" modal with the QR + an **"I Have Paid"** button (this is the real MVP path from task 4.1 — manual self-report, then admin confirms in Admin Orders).

Backend implication: the order needs to persist shipping address, chosen shipping method/cost, chosen payment method, and a payment reference/status — for KHQR that's "pending admin confirmation"; for Visa that's the Stripe PaymentIntent id + its status — all on one order record created at "Place Order" time. There's no intermediate per-step API call, the wizard only submits once at the end. `/order/confirm` (task 1.7) currently reads straight from the cart store and clears it on mount — once there's a real order API, it should instead read the just-created order by id.

Known gap from 3.1: `CartView.vue`/`CheckoutView.vue` still link to `/products/${item.productId}` using the mock cart's numeric `productId`, but product detail routing now uses slugs (`/products/:slug`, task 3.1). These links 404 until cart items are wired to real products with real slugs — fix as part of this task.

## Order Tracking notes (task 3.3)

Known gap: can't fully verify this end-to-end yet. Placing an order (Visa/ABA) already creates a real row and `/orders/:id` renders its real status/timeline, and the Admin Orders status dropdown is now wired to the real `PATCH /api/orders/{id}/status` endpoint (task 3.8). Still missing: KHQR payment confirmation isn't built (task 4.1), so a KHQR order can be advanced through delivery statuses by admin but never gets marked `paid`. Come back and verify the full checkout → tracking flow once 4.1 is done.

## Loyalty notes (task 3.6)

Points (5 per $1 of subtotal-after-discount) are credited automatically when an order's `payment_status` is `paid` — true today for Visa/ABA. KHQR orders stay `pending_confirmation` and earn nothing yet, since nothing transitions that status to `paid` until admin manual confirmation is wired in 4.1; `award_points_for_order` (backend/src/backend/routers/loyalty.py) will already do the right thing once that transition exists, no changes needed there. Redemption is real (`POST /api/loyalty/redeem/{reward_id}`, wired in Account) but a redeemed reward isn't yet a usable checkout discount — it just debits the points ledger.

## Admin Dashboard notes (task 3.7)

Product CRUD (`AdminProductsView.vue`) and dashboard stats/low-stock (`AdminDashboardView.vue`) go straight through Supabase via RLS (`admins manage products`, plus admin's `is_admin()` read access on `orders`/`customers`) — same pattern as pet profiles (3.4), no new backend router needed. Product image upload now actually wires to the `/api/storage/product-images` endpoint built in 2.4 (previously unused — the form only staged local blob previews). Low stock uses a single shop-wide `LOW_STOCK_THRESHOLD` (10, in `frontend/src/lib/products.ts`) since there's no per-product reorder-threshold column. "Total Revenue" / "Avg. Order Value" only count `payment_status = 'paid'` orders, so pending KHQR orders (see loyalty notes above) don't inflate the sales overview until 4.1 wires admin confirmation.

## Admin Orders notes (task 3.8)

Unlike 3.7's dashboard/product reads, this went through the existing `backend/src/backend/routers/orders.py` router (built in 3.2/3.3) rather than direct Supabase-from-frontend, since order status transitions already lived there with real business logic (forward-only enforcement). `GET /api/orders` now returns every order (joined with `customers.full_name`/`email`) when the caller is admin, instead of just the caller's own orders — same endpoint, branching on `customer.role`, so `OrderHistoryView` (customer-facing) is unaffected. `AdminOrdersView.vue` calls this plus the existing `PATCH /api/orders/{id}/status`; the status `<el-select>` only ever offers statuses after the order's current one (mirrors the backend's forward-only check) so a disallowed transition can't be attempted from the UI. KHQR "admin manual confirm" (payment_status → paid) is still task 4.1, not built here — see Order Tracking notes above.

## Docker Compose notes (task 3.9)

There's no local database service in the compose file — Supabase is the cloud-hosted project already referenced by both `.env` files, not something this stack runs itself, so `docker compose up` only needs `backend` and `frontend` containers. Dev-mode, not production: `backend/Dockerfile` runs `uvicorn --reload` via `uv`, `frontend/Dockerfile` runs `vite --host 0.0.0.0`, and both are bind-mounted into their containers with a named volume shadowing `.venv`/`node_modules` (so the host's already-installed deps don't clash with the container's) — this gets hot-reload during ongoing Phase 4/5 work instead of a rebuild-per-change prod image. Ports: backend `8000`, frontend `5173`, same as running natively, so **don't run `docker compose up` at the same time as native `bun run dev` / `uv run uvicorn`** — both bind the same host ports and the container will fail to start with an "address already in use" error.

Neither `backend/.env` nor `frontend/.env` were ever committed (each has its own nested `.gitignore` rule), so a fresh clone had no documented required vars — added `backend/.env.example` and `frontend/.env.example` (placeholder values, not the real Supabase keys) to close that gap. `docker-compose.yml` reads the real `.env` files via `env_file`, so they still need to exist locally before `docker compose up` — copy from the `.example` files and fill in real values.

Verified end-to-end with a throwaway compose project on alternate ports (18000/15173) so it wouldn't collide with the running native dev servers: backend `/health` returned `{"status":"ok"}`, frontend served HTTP 200. Not yet verified: Stripe/KHQR env vars (task 4.1 isn't built, so nothing to add yet — `backend/.env.example`/`docker-compose.yml` will need new entries once 4.1 lands) and a *production* build/serve path (this compose file is dev-only; if the final submission needs a prod-style container — built frontend behind a static server, backend without `--reload` — that's a separate follow-up, not covered here).

## Feature ↔ Task cross-reference

| Concept-note feature | Tasks |
|---|---|
| Product Catalog & Search | 1.3, 1.4, 3.1 |
| Collections | 1.15 |
| Shopping Cart & Checkout | 1.5, 1.6, 1.7, 3.2 |
| Secure Payment via KHQR / Stripe (Visa) | 4.1 |
| Admin Dashboard | 1.12, 1.13, 1.14, 3.7, 3.8 |
| Order Tracking | 1.8, 3.3 |
| Pet Profile Management | 1.11, 3.4 |
| Personalized Recommendations (rule-based) | 3.5 |
| Loyalty & Reward System | 3.6 |
