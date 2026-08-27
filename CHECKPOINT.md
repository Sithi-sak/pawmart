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
>
> **Scope change (2026-08-14):** Locked in the final admin/store-owner authority split, narrower than what 3.7/3.8 originally built (those predate the pivot). Store owners have full CRUD over only their own store's products and orders — already correctly enforced (3.10.1 RLS, 3.10.3 backend, 3.10.4 frontend). Chea Bunthay's admin role is limited to: reviewing seller applications (3.10.7/3.10.8), a read-only stores directory (3.10.9) plus the existing platform-wide aggregate stats widget (total revenue/orders/avg order value — read-only rollup numbers, not per-order editing, so it stays as-is), and banning a store/owner (new, 3.10.10). He does **not** create/edit/delete another store's individual products, and does **not** view or advance another store's individual orders. `AdminProductsView.vue`/`AdminOrdersView.vue` as built in 3.7/3.8 currently expose broader access than this (blanket `is_admin()` product/order RLS + backend `list_orders`, unscoped by store) — narrowing/removing that per-item CRUD is folded into 3.10.9/3.10.10 below rather than patched ad hoc.

- [x] **3.10.1 Schema** — `stores` table, `customers.role` widened to `customer`/`store_owner`/`admin`, `owns_store()` RLS helper, nullable `products.store_id`/`orders.store_id`, RLS scoping for store owners on products/orders/order_items/order_status_history/product-image storage alongside the existing platform admin (`supabase/migrations/20260812000000_multi_vendor_stores.sql`).
- [x] **3.10.2 Bootstrap + backfill** — `backend/scripts/create_store_owner.py` (mirrors `create_admin.py`): creates the Supabase Auth user, `customers.role='store_owner'` row, and `stores` row. Run once with a fixed slug, then a follow-up migration backfills `products.store_id` for the 16 seeded products via `select id from stores where slug = '<slug>'` (deterministic, not an ad-hoc SQL editor edit) and sets `products.store_id not null`; resolve `orders.store_id` nullability at the same time.
- [x] **3.10.3 Backend role/routes** — `core/deps.py` gains a `require_admin_or_store_owner` dependency; `routers/orders.py`: `create_order` validates all cart items share one `store_id` and stores it on the order, `list_orders`/`get_order` scope store owners to their own store's orders, `update_order_status` allows a store owner to update only their own store's orders; `routers/storage.py` upload/delete broadened from admin-only to admin-or-store-owner.
- [x] **3.10.4 Store-owner frontend** — `lib/stores.ts` (fetch/update store), `stores/auth.ts` role widened + `isStoreOwner` + `signInAdmin` generalized to `signInStaff`, new `/store/manage`, `/store/manage/products`, `/store/manage/orders` routes + `StoreOwnerLayout.vue` + `StoreOwnerDashboardView.vue`/`StoreOwnerProductsView.vue`/`StoreOwnerOrdersView.vue` (scoped near-duplicates of the Admin equivalents).
- [x] **3.10.5 Public storefront** — `/store/:slug` route + `StoreDetailView.vue` (store header + product grid); "Sold by {store}" link on `ProductCatalogView.vue`/`ProductDetailView.vue`.
- [x] **3.10.6 Cart single-store constraint** — `stores/cart.ts` `CartItem` gains `storeId`/`storeName`; adding a product from a different store than what's already in the cart prompts to clear the cart first (backend `create_order` already rejects mixed-store carts as defense in depth).
- [x] **3.10.7 Seller application intake** — public `store_applications` table (contact info, proposed store name, message; RLS allows anyone to insert a fresh `pending` row, admin-only to read); footer "Become a Seller" link + `/sell` route + `BecomeSellerView.vue` form; confirmation message only, no status-check portal (`supabase/migrations/20260812020000_store_applications.sql`, `lib/storeApplications.ts`).
- [x] **3.10.8 Admin seller request review** — `/admin/store-requests` + `AdminStoreRequestsView.vue`: list requests by status, **Reject** (direct Supabase update, admin RLS) with optional note, **Approve** opens a dialog to confirm/edit the store name+slug then calls `POST /api/store-applications/{id}/approve` (`routers/store_applications.py`, needs the backend because creating the `auth.users` row needs the service-role key — reuses the same provisioning logic as 3.10.2's script, factored into `services/store_owner.py`). Approval generates a random temp password, shown once in a "copy now" dialog for Chea Bunthay to relay to the seller manually — no email-sending dependency.
- [x] **3.10.9 Admin stores directory + narrow admin's product/order reach** — `/admin/stores`, read-only list of active stores (name, owner, product/order counts) for the platform admin; store *creation* now happens through 3.10.7/3.10.8, not this view. Also remove `AdminProductsView.vue`/`AdminOrdersView.vue` (or strip them down to read-only, if there's a real oversight reason to keep viewing) and narrow the underlying `"admins manage products"`/order-update RLS + backend `list_orders`/`update_order_status` so admin can no longer create/edit another store's products or advance another store's order status — see 2026-08-14 scope note. The dashboard's platform-wide aggregate stats widget (3.7) is unaffected.
- [x] **3.10.10 Ban a store / store owner** — admin action from `/admin/stores` to deactivate a store: needs a `stores.status` (active/banned) column, RLS/backend checks that block a banned store's owner from signing in as store_owner or managing products/orders, and the storefront (3.10.5) no longer listing/serving a banned store. See 2026-08-14 scope note.

## Bootstrap store owner notes (task 3.10.2)

Fixed bootstrap slug is `pawmart-flagship` (the 16 pre-pivot seeded products become this store's catalog). To provision: `uv run python scripts/create_store_owner.py <email> <password> "PawMart Flagship Store" pawmart-flagship [full_name]` from `backend/`, then apply `supabase/migrations/20260812010000_backfill_store_products.sql` — in that order, since the migration's `select id from stores where slug = 'pawmart-flagship'` needs the store row to already exist (a fresh migration can't create a real `auth.users`-backed owner on its own, same reasoning as 3.10.1). The migration backfills every pre-pivot `products`/`orders` row onto this store (there was only ever one shop before the pivot) and then sets both `store_id` columns `not null`. Neither the script nor the migration has been run yet — needs a real Supabase Auth admin call, not something to fire from an ad-hoc session; the user runs it against the actual project.

## Backend role/routes notes (task 3.10.3)

The FastAPI backend talks to Supabase with the service-role key (`core/supabase.py`), so it bypasses RLS entirely — the 3.10.1 RLS policies are defense-in-depth for direct-from-frontend Supabase calls (product CRUD, seller applications, etc.), not the enforcement path for anything that goes through this backend. That means every scoping rule added here (single-store cart, store owner sees only their own orders) is real application logic in `routers/orders.py`, not something RLS was already doing for us. `_owned_store_id()` looks up a store owner's `stores.id` by `owner_id` (unique per owner, one store per owner per the 3.10.1 schema) and is reused across `list_orders`/`get_order`/`update_order_status`.

## Seller application review notes (tasks 3.10.7/3.10.8)

Two design calls made with the user and locked in: (1) credential handoff on approval is a one-time password reveal in the admin UI, not an emailed invite link — avoids taking a dependency on Supabase's email delivery being configured, which nothing else in this project currently relies on (`create_admin.py`/`create_store_owner.py` both set `email_confirm: true` and skip email entirely). Chea Bunthay copies the password and relays it to the seller himself, same human-mediated pattern as KHQR payment confirmation. (2) No applicant-facing status-check portal — submitting just shows a "thanks, we'll review and reach out" confirmation; Chea Bunthay follows up outside the app once he's decided, so there's no lookup route/UI to build for a one-time submission.

`store_applications` never stores a password — the applicant doesn't choose one. `services/store_owner.py::provision_store_owner` is shared by both the CLI bootstrap script (3.10.2) and the approval endpoint; note it upserts the `stores` row keyed on `owner_id` (unique per owner), not `slug` — upserting on slug would let an admin's slug choice silently reassign a *different* owner's existing store if it collided, whereas keying on owner_id makes a real slug collision surface as a clean 400 instead.

Submission and rejection are plain RLS-governed Supabase calls from the frontend (same "direct via RLS" pattern as the rest of admin CRUD, see 3.7 notes) — only approval goes through the backend, since only it needs the service-role key to call `auth.admin.create_user`.

## Store-owner frontend notes (task 3.10.4)

Both admins and store owners now sign in through the same `/admin/login` form (`AdminLoginView.vue` calling the generalized `auth.signInStaff`, which accepts either role) rather than building a second login page/route — after sign-in, the redirect defaults to `/admin` for an admin and `/store/manage` for a store owner (or the `?redirect=` deep link if one was set by the router guard). `StoreOwnerLayout.vue`/`StoreOwnerDashboardView.vue`/`StoreOwnerProductsView.vue`/`StoreOwnerOrdersView.vue` live under `views/store/`, mirroring `views/admin/`.

`StoreOwnerOrdersView.vue` reuses `lib/orders.ts` unchanged — `list_orders`/`update_order_status` (task 3.10.3) already scope a store-owner caller to their own store's orders server-side, so no client-side filtering was needed. Products aren't backend-scoped the same way (product CRUD goes straight through Supabase via RLS, not the FastAPI backend — see 3.10.3 notes), so `lib/products.ts::fetchProducts` gained an optional `storeId` filter and `ProductInput` gained an optional `store_id`, which `StoreOwnerProductsView.vue` always sets to the signed-in owner's own store (required both by the NOT NULL column and the `owns_store(store_id)` RLS check). `lib/adminDashboard.ts::fetchDashboardStats` similarly gained an optional `storeId` filter for the store-scoped revenue/orders numbers; "New Customers" is dropped from the store dashboard entirely since customers aren't scoped to a store, so per-store new-customer counts aren't a meaningful stat.

`lib/stores.ts` covers fetch-by-owner and update; the update surface is intentionally narrow (`description`/`logo_url` only) — store `name`/`slug` are left read-only here since `slug` is the public storefront identity (`/store/:slug`, task 3.10.5) and a self-service rename would desync it. Store owners edit their profile inline on the Dashboard view (no separate settings route, since none was called for and the dashboard already needed both fetch and update).

Known gap, not fixed here: `AdminProductsView.vue`'s create-product flow still doesn't set `store_id` at all, so once the 3.10.2 backfill migration is applied (making `products.store_id` NOT NULL), creating a *new* product as admin will fail at the DB level — pre-existing gap surfaced by this task, not introduced by it. Admin product creation has no notion of "which store" yet; likely resolved alongside 3.10.9 (admin stores directory) once there's a natural place for admin to pick a target store.

## Public storefront notes (task 3.10.5)

`lib/products.ts::PRODUCT_COLUMNS` now embeds `stores(id, name, slug)` alongside the existing `categories` embed (real FK, `products.store_id -> stores(id)`), so every `Product` returned by `fetchProducts`/`fetchProductBySlug`/`fetchRelatedProducts`/recommendations carries its store for free — no separate lookup needed for the "Sold by" links. `lib/stores.ts` gained `fetchStoreBySlug` alongside the existing `fetchStoreByOwnerId`. `/store/:slug` is a public route (no `requiresAuth`), registered as a `DefaultLayout` child like `/products/:slug`; it doesn't collide with the separate `/store/manage` route tree since Vue Router ranks the static `manage` segment over the dynamic `:slug` regardless of registration order. `StoreDetailView.vue` reuses `fetchProducts(storeId)` (already built for the store-owner dashboard, 3.10.4) for the product grid — no new products endpoint needed. On `ProductCatalogView.vue` the "Sold by" link is a `<button>` (not a nested `<a>`) inside the product-card `RouterLink`, using `@click.stop.prevent` + `router.push` to avoid invalid anchor nesting while still stopping the outer card's own navigation.

Products created before the 3.10.2 backfill migration is applied (or any product with a still-null `store_id`) simply show no "Sold by" line — the link is `v-if="p.stores"` guarded, so this degrades cleanly rather than erroring.

## Cart single-store constraint notes (task 3.10.6)

`cart_items` itself gained no `store_id` column — the constraint is purely a frontend check derived from the product's own store, so `load()`'s Supabase query now embeds `products(..., store_id, stores(id, name))` to populate each `CartItem.storeId`/`storeName` on refresh, matching what `addItem` already sets from the `Product` passed in (`lib/products.ts` already embeds `stores` on every `Product`, task 3.10.5). `conflictsWithCart(product)` compares against `items[0]`'s store (a cart is single-store by construction once non-empty, so the first item's store represents all of them) and is exported alongside a new `activeStoreName` computed for the confirmation copy. The three add-to-cart call sites (`ProductCatalogView.vue`, `ProductDetailView.vue`, `StoreDetailView.vue`) each check `conflictsWithCart` before adding and, on conflict, run an `ElMessageBox.confirm` (same pattern as the destructive-action confirms in `StoreOwnerProductsView.vue`/`AdminProductsView.vue`) offering to clear the cart; cancelling leaves the cart untouched. `mergeGuestCartIntoAccount` (guest cart → account cart on login) isn't touched here — it could theoretically fold two different stores' items together if both a guest session and an existing account cart had items, but that gap predates this task and is still caught by the backend's `create_order` rejection at checkout, per the existing defense-in-depth note.

## Admin stores directory notes (task 3.10.9)

`AdminProductsView.vue`/`AdminOrdersView.vue` (3.7/3.8) are deleted outright rather than stripped to read-only — there was no oversight reason to keep a second, admin-flavored copy of views that `StoreOwnerProductsView.vue`/`StoreOwnerOrdersView.vue` already cover for the owning store, and the read-only oversight need is now met by the new `/admin/stores` directory instead. `lib/products.ts`/`lib/orders.ts` (`createProduct`/`updateProduct`/`deleteProduct`/`fetchOrders`/`updateOrderStatus`) are untouched since the store-owner views still call them.

Two RLS write grants were narrowed in `supabase/migrations/20260814000000_narrow_admin_product_order_writes.sql`: `"admins manage products"` is dropped outright (no replacement needed — `"products are publicly readable"` already covers admin's read need for the directory's product counts), and `"admins update orders"` is replaced by `"store owners update own orders"` (drops the `is_admin()` branch). Order/order_items/order_status_history *select* policies keep their existing `is_admin()` branch untouched — narrowing those wasn't asked for, and the admin dashboard's aggregate stats widget (task 3.7) and the new stores directory's order counts both still read via those policies directly from the frontend.

Backend `routers/orders.py` changes go further than RLS, since the backend uses the service-role key and bypasses RLS entirely (same reasoning as the 3.10.3 notes): `list_orders`/`get_order` drop their `customer.role == "admin"` bypass entirely, so an admin calling either now sees only their own orders as a plain customer would (relevant if Chea Bunthay ever buys something himself) — not the seller/order-viewing bypass they had before. `update_order_status` swaps its dependency from `require_admin_or_store_owner` to a new `require_store_owner` (`core/deps.py`), fully locking admin out of advancing any order's status rather than just scoping them to "another store's" order, since admin owns no store of their own to advance orders for anyway. `require_admin_or_store_owner` stays as-is and still gates `routers/storage.py`'s product-image upload/delete — that wasn't named in the checkpoint's narrowing scope, and admin having no product/order write path doesn't itself imply admin should also lose storage access.

`lib/stores.ts::fetchStoresForAdmin` fetches all stores (with `owner:customers(full_name, email)` embedded via the existing FK) plus all `products`/`orders` rows (`store_id` column only) and reduces counts client-side — same "fetch then reduce" pattern as `lib/adminDashboard.ts`'s stats, since Supabase JS has no groupBy/count-by query. `AdminStoresView.vue` is intentionally read-only (search by store/owner/email, product/order counts, link out to the public storefront) — no create/edit/delete, since store creation is 3.10.7/3.10.8's job and banning is deferred to 3.10.10.

Correction made after this task (2026-08-14): `AdminDashboardView.vue`'s Low Stock Alerts widget was left in place when `AdminProductsView.vue` was removed, but it's exactly the kind of individual-store inventory detail the scope note narrows away — only the aggregate sales-overview widget (revenue/orders/AOV) was meant to stay platform-wide. Removed the widget (and its now-unused `fetchProducts`/`isLowStock`/`LOW_STOCK_THRESHOLD` usage) from the admin dashboard; `StoreOwnerDashboardView.vue` already has its own store-scoped low-stock widget, so store owners still see it for their own inventory.

## Ban store notes (task 3.10.10)

`stores.status` (`active`/`banned`, default `active`, `supabase/migrations/20260814010000_ban_stores.sql`) is gated through a single choke point: `owns_store()` now also requires `status = 'active'`, and since every store-owner product/order RLS policy (3.10.1) and storage policy already route through `owns_store()`, banning cuts off a store owner's read+write access to their own products/orders/order history/image uploads in one place — no per-policy changes needed beyond that. The backend bypasses RLS (service-role key, see 3.10.3 notes), so it needs its own mirror: `_owned_store_id()` (`routers/orders.py`) now filters `status = 'active'` too, and `core/deps.py` gained `_require_active_store()`, called from both `require_store_owner` and the store-owner branch of `require_admin_or_store_owner` — covers `update_order_status` and the storage upload/delete routes.

Public visibility follows the same "fetch then gate on a status column" pattern as `loyalty_rewards`' `is_active` check: `"stores are publicly readable"` and `"products are publicly readable"` now require `status = 'active'` for everyone except `is_admin()` (needs the full list for `/admin/stores`) and, for stores, the owner themselves (`owner_id = auth.uid()`, so `signInStaff` below can read the row to check it). `StoreDetailView.vue`/`ProductCatalogView.vue`/`ProductDetailView.vue` needed no code changes — a banned store's row/products simply stop coming back from Supabase, so `StoreDetailView.vue`'s existing "not found" branch covers a banned store's `/store/:slug` for free.

`stores/auth.ts::signInStaff` blocks sign-in outright for a store owner whose store is banned (extra query + explicit error, signs the session back out) — this is the "signing in" half of the checkpoint's requirement, enforced client-side same as the existing role check just above it. Known gap, not fixed here: a store owner already signed in when banned keeps their session (nothing re-checks status on refresh/navigation), so `/store/manage/*` stays reachable until they sign out — RLS/backend still block every read and write once they're there, so nothing leaks, but the UI just goes quietly empty instead of showing a clear "you've been banned" message. Revisiting this would mean either polling store status or invalidating the session server-side on ban, both overkill for MVP scope.

`AdminStoresView.vue` gained a Status column + a Ban/Unban button (`lib/stores.ts::setStoreStatus`, kept separate from `updateStore` since that's the store owner's own narrow self-edit surface) with an `ElMessageBox.confirm` before either direction, same confirm-before-destructive-action pattern as `AdminStoreRequestsView.vue`'s reject flow.

## Phase 4 — Payment (final task)

- [ ] **4.1 Payments — Stripe (Visa) + KHQR / Bakong (MVP, manual verification)** — Visa card payments go through a real Stripe integration (PaymentIntent, card fields via Stripe Elements, charged when "Place Order" fires — replaces the current simulated Visa flow); KHQR: generate KHQR QR code with Chea Bunthay's ABA bank details + order total at checkout, "I have paid" button, admin manual confirm in Admin Orders. (Full ABA PayWay API automation is still out of scope for submission — see project memory.) Needs a Stripe account + API keys before build starts.
  - [x] Stripe (Visa) slice done — see notes below.
  - [ ] KHQR admin manual confirm still outstanding (Admin/store-owner Orders can't yet flip a KHQR order's `payment_status` to `paid`).

### Stripe (Visa) notes (task 4.1, partial)

Two-endpoint flow, order only ever inserted once payment is verified: `POST /api/orders/payment-intent` (new, `routers/orders.py`) recomputes pricing server-side via a shared `_price_cart` helper (factored out of `create_order`, also used by `create_order` itself so both endpoints price a cart identically) and creates a Stripe PaymentIntent for the total, `payment_method_types=["card"]`, `metadata.customer_id` set to the caller. Frontend (`CheckoutView.vue`) mounts a Stripe Elements Card Element in the Payment step (replacing the old raw card-number/expiry/cvv inputs — Stripe Elements is PCI-hosted, so those fields never touch app state or the backend), calls the new endpoint from `placeOrder()`, then `stripe.confirmCardPayment()`. Only on `paymentIntent.status === 'succeeded'` does it call the existing `POST /api/orders` with the intent id attached; on decline it shows the error and stays on Review (order is never created), matching the flow already described below in "Checkout flow notes".

`create_order` never trusts the frontend's claim that a Visa payment succeeded: for `payment_method: "visa"` it re-fetches the PaymentIntent from Stripe by id, and only proceeds if `metadata.customer_id` matches the caller, `status == "succeeded"`, and `amount` matches the server's own freshly recomputed total (cents) — a mismatch on any of those is a 400/403, not a silently-trusted order. `orders.stripe_payment_intent_id` (new, `supabase/migrations/20260814020000_stripe_payment_intent.sql`, unique) records which intent paid for the order and doubles as a replay guard — reusing the same intent id for a second order hits the DB's unique constraint. No new `payment_status` value was needed: Visa orders are only ever inserted post-verification, so `payment_status` stays `paid` immediately, same as before.

Needs `STRIPE_SECRET_KEY` (backend `.env`) and `VITE_STRIPE_PUBLISHABLE_KEY` (frontend `.env`) — both added to their respective `.env.example` files; the user already had test-mode keys and added them locally. Migration `20260814020000_stripe_payment_intent.sql` has been applied to the live Supabase project via `bunx supabase db push`.

Not done: KHQR admin manual confirm (still needs a Confirm Payment action on Admin/store-owner Orders that flips `payment_status` to `paid` and lets `award_points_for_order` run for KHQR orders) and ABA PayWay stays a no-op redirect panel, both deliberately out of scope for this pass.

## Phase 5 — Testing (after everything else is done)

- [x] **5.1 Auth & account** — signup/login/logout (email + Google), password reset, admin login (non-Gmail gate), session persistence across refresh, protected-route redirects for guest/customer/admin.
- [x] **5.2 Catalog & product detail** — filter/search/sort combinations, empty-result state, product detail for in-stock/out-of-stock/no-image products, related products, recommended products (guest fallback vs personalized).
- [ ] **5.3 Cart & checkout** — quantity edit/remove, voucher valid/invalid, stock-limit edge cases, full checkout wizard for all 3 payment methods (Stripe/Visa success + declined card, ABA informational, KHQR "I Have Paid"), order confirmation reads the real created order.
- [ ] **5.4 Order tracking & history** — status timeline renders correctly at each stage, order history list/empty state, access-control check (customer can't view another customer's order by guessing an id).
- [ ] **5.5 Pet profiles & recommendations** — create/edit/delete pets, recommendations update when a pet's species changes or after a new order, guest vs signed-in behavior.
- [ ] **5.6 Loyalty & rewards** — points accrue on order, redemption flow, balance never goes negative.
- [ ] **5.7 Admin** — product CRUD (incl. image upload/remove), low-stock alerts, sales overview numbers match real orders, order status transitions (can't skip/go backward), KHQR manual payment confirmation.
- [ ] **5.8 Security / RLS spot-checks** — non-admin can't reach `/admin/*` API or UI, customers only ever see their own pets/orders/loyalty transactions via direct Supabase queries, admin-only writes rejected for a plain customer token.
- [ ] **5.9 Cross-cutting** — mobile/responsive pass on key pages, loading/error states on slow or failing network, full stack boots clean via Docker Compose (3.9) with a fresh database.

## Catalog & product detail testing notes (task 5.2)

Both catalog filter/search/sort and the recommendation engine's guest-vs-personalized branching are pure logic with no existing coverage (task 3.1/3.5) — `frontend/src/lib/__tests__/recommendations.spec.ts` unit-tests `fetchRecommendedProducts` directly (mocking `@/lib/products` and `@/lib/supabase`), while `ProductCatalogView.vue`/`ProductDetailView.vue` filter/sort/render logic lives inline in `<script setup>` computeds with no refs exposed for direct access, so those two are covered with `@vue/test-utils` `mount()` instead — first component-mount tests in the repo (`@vue/test-utils` was installed in 5.1 but unused until now).

`ProductCatalogView.spec.ts` stubs `el-input`/`el-select`/`el-option`/`el-checkbox-group`/`el-checkbox` with minimal `v-model`-forwarding replacements instead of mounting real Element Plus — the real `el-select` pulls in teleport/popper/`ResizeObserver` machinery that's irrelevant to testing this view's own filter/sort computed, and is painful to drive reliably under happy-dom. `vue-router` is mocked wholesale (`RouterLink` stub + `useRouter` returning a fake `push`) since the view only needs it for link hrefs and the "Sold by" store-navigation click, neither of which this task covers. Confirms: species/category/brand/price-range/search filters individually and combined, all three sort orders plus the newest-first default, the two distinct empty-result paths (filters produce zero matches vs. an empty catalog — same UI branch, `paginatedProducts.length === 0`), the separate load-error branch, and that changing a filter while on page 2+ resets to page 1 (the `watch` at `ProductCatalogView.vue:137`).

`ProductDetailView.spec.ts` mocks `@/lib/products`, `@/lib/recommendations`, and `@/stores/auth` (a fake `useAuthStore` with a mutable `customer` getter, swapped per test between `null` and `{id: 'cust-1'}`) rather than driving real Supabase/Pinia auth state — simpler than reproducing 5.1's auth mocking for a view that only reads `auth.customer?.id`. Covers in-stock/out-of-stock rendering (stock text, `.is-out` class, add-to-cart disabled state, quantity-stepper `+` disabled at the stock ceiling), the no-image 4-placeholder-tile gallery vs. real image tiles, related products rendering plus the section being entirely absent (not just empty) when `fetchRelatedProducts` returns `[]`, and three recommendation states: personalized-with-picks (section shows), guest-fallback (section hidden even though `recommendedProducts` is non-empty — `ProductDetailView.vue:261`'s `v-if="personalized && ..."` guard), and signed-in-with-no-scoring-signal (also hidden, since `recommendations.ts` reports `personalized: false` for its own unranked fallback — same UI branch as the guest case, different backend reason, worth covering separately since it's easy to accidentally regress one without the other).

Found and left alone, not a real issue: `bun run test` prints a `DOMException [AbortError]` + happy-dom internal stack trace to stderr during window teardown for some of the `ProductDetailView` tests (first appeared with a fake `https://...` image URL in a fixture, still occurs after switching to a relative path) — cosmetic only, doesn't fail any test or affect the exit code (`bun run test` still exits 0, all 66 tests pass); root cause not tracked down further since it's a happy-dom teardown-internals question, not a test-correctness one.

## Auth & account testing notes (task 5.1)

Testing infra didn't exist yet on either side — added it as part of this task rather than as prep work: `backend/tests/` (pytest, already a dev dependency but unused) and `frontend/vitest.config.ts` + `vitest`/`@vue/test-utils`/`happy-dom` (new dev deps, `bun run test` / `bunx vitest run`).

Login/signup/logout/password-reset/session-persistence have no backend routes at all — `stores/auth.ts` calls `supabase-js` directly from the frontend (Supabase Auth), so that's all frontend-only, covered by `frontend/src/stores/__tests__/auth.spec.ts` against a mocked `@/lib/supabase` client (chainable fake mimicking the thenable Postgrest builder). Covers: email sign-in/sign-up/sign-out + error paths, Google OAuth (only that `signInWithOAuth` fires with `provider: 'google'` — the actual redirect/consent flow isn't something a unit test can exercise), password reset request + update, the Gmail-only gate (`isAllowedCustomerEmail`, a pure function), `signInStaff`'s non-Gmail admin/store-owner path and its banned-store rejection, and session persistence (`init()`'s `getSession` + the `INITIAL_SESSION` re-announcement dedupe that guards against a duplicate `ensureCustomerRow` call).

Protected-route redirects covered end-to-end in `frontend/src/router/__tests__/guard.spec.ts` by driving the *real* `router.beforeEach` guard through `router.push()` against the real route table, not a reimplementation of the guard's logic — guest/customer/admin/store_owner × requiresAuth/requiresAdmin/requiresStoreOwner, plus admin/store_owner being bounced off customer-facing account pages to their own dashboard. Hit one real vue-router gotcha: pushing to the exact same resolved location as the current one is a silent no-op that skips guards entirely, which surfaced as a false pass/fail between two consecutive tests targeting the same route — fixed by parking on an unmatched dummy path in `beforeEach` before every test's actual push, not by changing test order (order shouldn't matter for independent test cases).

Backend-side "admin login" role/access gating (`core/deps.py`'s `require_admin`/`require_store_owner`/`require_admin_or_store_owner`, including the store-ban check threaded through 3.10.10) is covered by `backend/tests/test_deps.py` against a fake in-memory Supabase client (`backend/tests/conftest.py`) — this is what actually enforces admin vs store-owner vs customer access on every backend route, RLS being defense-in-depth only for direct-from-frontend Supabase calls (see 3.10.3/3.10.9 notes).

Not covered here, deliberately out of scope for 5.1: real Google OAuth consent flow, Supabase email delivery (password reset/email confirmation actually landing), and RLS-level enforcement (own `customers`/`pet_profiles`/`orders` visibility) — the latter is task 5.8.

Found and left alone (pre-existing, unrelated to auth): `bun run type-check` fails on `AdminStoreRequestsView.vue:180` (`TS7053`, implicit `any` indexing a `Record<StoreApplicationStatus, string>`) — confirmed via `git stash` that this predates this task's changes, not introduced by it.

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
