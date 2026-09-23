# PawMart — Comprehensive Project Recap

*A single reference document covering what PawMart is, why it was built, how it works, what was built when, and what was deliberately left out. Current as of 2026-09-22 (latest commit `184f889`).*

---

## 1. Executive Summary

PawMart is a full-stack, multi-vendor e-commerce marketplace for pet products — food, accessories, toys, grooming, and healthcare items. It began as a single-shop freelance build and was later pivoted into a marketplace model where independent sellers ("stores") run their own storefronts under one platform.

The system is feature-complete end to end: customer shopping and checkout, seller/store-owner management tools, a platform-admin oversight layer, real payment processing (Stripe for cards, KHQR/Bakong QR for Cambodian bank apps), a loyalty rewards program with real checkout discounts, rule-based product recommendations, wishlists, product options and reviews, and a tested, containerized, deployable stack.

| | |
|---|---|
| **Name** | PawMart |
| **Client / owner** | Chea Bunthay (classmate; paid freelance work) |
| **Developer role** | Sole developer — full stack, schema, deployment |
| **Category** | E-commerce web platform, pet vertical, multi-vendor marketplace |
| **Timeline** | 2026-08-07 → 2026-09-20 (50 commits); concept-note allowance was 4 months |
| **Status** | All planned phases complete (Phases 1–5 + post-testing polish). 170 frontend tests, 69 backend tests. |

---

## 2. Business Context & Problem Statement

### The problem
Pet owners struggle to find reliable pet products in one place. Traditional pet shops have limited hours, restricted stock, and require an in-person visit — inconvenient for people who need food, toys, grooming supplies, or healthcare items on their own schedule.

### The solution
A web marketplace where customers browse, search, and buy pet products at any time from several independent sellers under one roof. Customers get one consistent shopping / checkout / tracking experience regardless of which store they buy from. Sellers get a storefront and a management dashboard without building their own e-commerce infrastructure. The platform owner gets oversight and a single payment collection point.

### Ownership model
- **Platform owner (Chea Bunthay)** — owns and operates PawMart; holds the platform-admin role.
- **Store owners (sellers)** — independent vendors who apply to sell, get approved by the admin, and then run their own storefront at `/store/:slug`, managing only their own products and orders.
- **Customers** — shop across all stores with one account, one cart, one login, and one platform-wide loyalty program.
- **Payments** — a *single shared payout destination* for the whole platform (the owner's bank / Stripe account). A "store" is a catalog / ownership / fulfillment grouping, not a separate payment split. Per-vendor payouts were explicitly deferred.

### How the model evolved
The project began as a single shop with one "Administrator" managing everything. Partway through the build the client confirmed the real intent was a **multi-vendor marketplace**: independent stores, each owner managing only their own products and orders, a public storefront per store, and the admin's role narrowed to oversight (approving sellers, monitoring stores, banning bad actors) rather than day-to-day catalog work. This was a substantial rework of schema, permissions/RLS, routing, and already-built admin views — see §10.

---

## 3. Features

### Core e-commerce
| Feature | Description |
|---|---|
| **Product Catalog & Search** | Browse by category (food, accessories, toys, grooming, healthcare); filter by pet type, brand, price range, and store; sort and paginate. Slug-based product URLs. |
| **Product Detail** | Images, description, stock, **product options** (size/variant), **customer reviews**, promotion/discount badges, related products, and a "Sold by {store}" link. |
| **Shopping Cart & Checkout** | Server-persisted cart, quantity adjust, loyalty-reward discount, and a 3-step wizard (Shipping → Payment → Review) with a persistent order-summary sidebar. "Buy now" skips the cart for a single item. |
| **Secure Payment** | Stripe (PaymentIntent + Stripe Elements) for Visa/cards; KHQR/Bakong QR scannable by any Cambodian banking app (ABA, ACLEDA, Wing); ABA PayWay as an informational panel. |
| **Order Tracking** | Post-purchase status timeline — Confirmed → Processing → Shipping → Out for Delivery → Delivered — plus full order history with item images. |
| **Admin Dashboard** | Platform-wide oversight (see §4). |

### Differentiators
| Feature | Description |
|---|---|
| **Pet Profile Management** | Customers register pets (name, species, breed, age, weight, diet); loaded app-wide through a Pinia `pets` store. |
| **Personalized Recommendations** | **Rule-based, explicitly not ML.** Weighted scoring: pet-species match (3) > purchase-category affinity (2) > new arrival (1). Falls back to newest arrivals for guests, and the UI flags whether a list is genuinely personalized. |
| **Loyalty & Rewards ("Paws Rewards")** | 5 points per $1 of post-discount subtotal, awarded automatically on paid orders. Points redeem for real rewards — a dollar discount or free shipping — applied directly as a checkout discount, not just a ledger debit. |
| **Multi-vendor Marketplace** | Seller application/approval workflow, per-store dashboards, public storefronts, store bans. |

### Marketplace / seller features
- **Public storefront per store** (`/store/:slug`) with its own header and product grid.
- **Seller application flow** — a public "Become a Seller" form (`/sell`) creates a request; the admin reviews at `/admin/store-requests` and rejects (with an optional note) or approves. Approval provisions a real Supabase Auth user + store row and reveals a **one-time temporary password** for the admin to relay manually — no email-sending dependency anywhere in the system.
- **Store-owner dashboard** (`/store/manage`) — own-store product CRUD with image upload, own-store order list with forward-only status updates, sales overview, low-stock alerts, and an editable store profile (description/logo).
- **Platform admin** (`/admin`) — aggregate read-only stats (revenue, orders, average order value), a read-only stores directory, seller-application review, ban/unban, and an **upcoming-stores** teaser list (marketing-only rows with no owner or products, shown as "Coming Soon" under the catalog's store filter).
- **Single-store cart rule** — a cart holds items from one store at a time; adding from another store prompts to clear it first. A deliberate simplification instead of split-cart / multi-order checkout.

### Later additions (post-testing polish, Sep 2026)
- **Wishlist** — server-side `wishlist_items` table mirroring the cart, so saved products survive refresh and follow the customer across devices (`/wishlist`).
- **Product options & reviews** on the detail page.
- **Promotion / discount tags** — boolean tags upgraded to real detail: a `discount_percent` for discounts and a free-text `promotion_note` (e.g. "Buy One Get One Free"), surfaced as badges on the catalog and homepage.
- **Full Cambodia address data** — a ~1.8 MB province → district → commune → village dataset driving a cascader in checkout shipping.
- **Order item images** in tracking/history, PawMart logo favicon, homepage promo section.

---

## 4. Roles & Permissions

| Role | Scope |
|---|---|
| **Guest / Customer** | Browse, buy, track own orders, manage own pets and wishlist, earn/redeem points. Email+password or Google OAuth. |
| **Store owner** | Full CRUD over **only their own store's** products; view and forward-advance only their own store's orders; edit their own store profile. Cannot see or touch another store's data. |
| **Platform admin** | Store-level oversight only — *not* per-item product/order management. Approves/rejects seller applications, reads the stores directory and platform rollups, bans/unbans stores, manages the upcoming-stores list. Deliberately cannot create/edit/delete another store's products or advance another store's orders. |

Admins and store owners share one staff login screen (`/admin/login`); role determines redirect target and available UI.

**Enforcement is layered:**
- FastAPI routes gate by role via dependency injection (`require_admin`, `require_store_owner`, `require_admin_or_store_owner`, plus an active-store check that locks out banned owners). The backend holds the service-role key and bypasses RLS, so it is the real enforcement point for backend-mediated actions.
- Direct frontend→Supabase calls (catalog reads, pet profiles, wishlist, product CRUD, seller applications) are enforced by Postgres Row-Level Security.
- A **privileged-column lockdown trigger** (`20260913020000`) prevents a customer from self-promoting their `role`, and a banned store owner from un-banning themselves.

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`), TypeScript |
| UI | Element Plus + Phosphor icons |
| State | Pinia (`auth`, `cart`, `pets`, `wishlist` stores) |
| Routing | Vue Router 5 with role-aware navigation guards |
| Build/tooling | Vite 8, vue-tsc, ESLint + oxlint, Prettier |
| Frontend tests | Vitest + @vue/test-utils + happy-dom |
| Backend | Python 3.11, FastAPI, managed with **uv** |
| Backend tests | pytest, with an in-memory fake Supabase client |
| Database | Supabase (managed PostgreSQL) with RLS throughout |
| Auth | Supabase Auth (email/password + Google OAuth for customers; email/password for staff) |
| Storage | Supabase Storage (product images) |
| Payments | Stripe (PaymentIntents + Elements); KHQR/Bakong QR generated client-side via `qrcode` |
| Containers | Docker + Docker Compose (dev-mode hot reload) |
| JS runtime | Bun |
| Hosting | Vercel (frontend SPA rewrites via `vercel.json`) |
| VCS | Git + GitHub |

**Why this stack:** deliberately matched to a concurrent project ("Niyay") by the same developer, so auth setup, Docker config, Supabase patterns, and the KHQR integration could be reused rather than re-derived — minimizing context-switching across two simultaneous freelance builds.

---

## 6. System Architecture

```
                        ┌──────────────────────┐
                        │    Vue 3 Frontend     │
                        │ (Vite, Pinia, El+)    │
                        └──────────┬───────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
      Direct Supabase calls                  FastAPI backend calls
   (RLS-enforced: catalog, pets,          (service-role key, bypasses RLS —
    wishlist, reviews, loyalty reads,      real business logic: order pricing
    seller applications, most              & creation, stock decrement,
    product/store CRUD)                    forward-only status transitions,
                │                          Stripe verification, storage
                │                          uploads, seller provisioning)
                ▼                                     ▼
        ┌────────────────────────────────────────────────────┐
        │        Supabase — Postgres + Auth + Storage         │
        └────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Stripe (cards)      │
                         │ KHQR / Bakong (QR)  │
                         └────────────────────┘
```

Two write paths coexist **by design**: simple RLS-safe CRUD goes straight from Vue to Supabase; anything with cross-cutting business logic goes through FastAPI.

**Backend surface** (`backend/src/backend/routers/`): `products`, `categories`, `customers`, `orders` (payment-intent, create, list, detail, status patch), `loyalty` (redeem), `pet_profiles`, `storage` (product-image upload/delete), `store_applications` (approve).

**Frontend layers**: `DefaultLayout` (shop), `AuthLayout`, `AdminAuthLayout`, `AdminLayout`, `StoreOwnerLayout` — each gated by router meta (`requiresAuth`, `requiresAdmin`, `requiresStoreOwner`).

---

## 7. Data Model

| Table | Purpose |
|---|---|
| `customers` | One row per user; `role` ∈ `customer` / `store_owner` / `admin`; loyalty balance. |
| `stores` | One per seller; `status` ∈ `active` / `banned`; one `owner_id`. |
| `upcoming_stores` | Admin-managed "Coming Soon" teaser rows — no owner, no products. |
| `products` | Belongs to a `store_id` and `category`; slug, stock, `is_discounted` / `discount_percent`, `promotion_note`. |
| `categories`, `product_options`, `product_reviews` | Catalog detail tables. |
| `cart_items` | Server-side cart per customer (single-store rule enforced in app logic). |
| `wishlist_items` | Server-side saved products, unique per (customer, product). |
| `orders` / `order_items` / `order_status_history` | Order lifecycle scoped to a `store_id`; status only advances forward. |
| `loyalty_transactions` / `loyalty_rewards` | Earn/redeem ledger; rewards carry `discount_amount` and/or `free_shipping` so a redemption is a machine-readable checkout discount. |
| `store_applications` | Public seller intake queue (`pending`/`approved`/`rejected`). |
| `pet_profiles` | Customer-owned pet records driving recommendations. |

All schema changes live as **27 numbered migration files** in `supabase/migrations/` — never ad-hoc SQL-editor edits — from `20260807000000_init_schema.sql` through `20260916010000_wishlist_items.sql`.

---

## 8. Payments

- **Stripe (Visa/card)** — the backend creates a PaymentIntent for a *server-recomputed* total; the frontend collects card details via Stripe Elements (details never touch app state, keeping PCI scope minimal); the order is created **only after** the backend independently re-verifies the PaymentIntent's status, amount, and owning customer against Stripe. The frontend's claim of success is never trusted.
- **KHQR / Bakong** — a real KHQR code is generated client-side at checkout, encoding a link to an in-app "scan to confirm" screen (`/khqr-pay`) that mimics a bank-app confirmation. With no live Bakong webhook to gate on, the order is created and marked paid at "Place Order" — the same instant as a verified card charge. This was a deliberate MVP call: the originally planned "admin manually confirms payment" step was dropped because it added friction without adding real verification. Funds settle to the platform owner's account.
- **ABA PayWay** — informational panel only; API automation explicitly out of scope.

---

## 9. Known Gaps & Deliberate Limits

Documented trade-offs, not oversights:

- No per-vendor payout splitting — all payments settle to one shared account.
- No email dependency anywhere (seller approval hands off a one-time password in the admin UI; no emailed invites).
- A store owner banned mid-session keeps their session until sign-out. RLS and the backend still block every read/write, so nothing leaks, but the UI degrades quietly instead of saying "you've been banned".
- Order status can skip ahead several steps in one update (backward moves are blocked; skip-ahead is allowed by design).
- Stock is enforced at the backend pricing/order-creation step, not reactively in the cart UI.
- A customer can insert a fabricated line item into an order they already own via a direct RLS-permitted call — low severity: it cannot touch another customer's data or produce a refund or extra stock.
- ABA PayWay automation not built.
- Mobile/responsive QA was a code-level audit (fixed-width dialogs and a flex-overflow bug found and fixed), not a full manual pass across every breakpoint.

---

## 10. Decision Timeline

1. **Initial concept** — single-shop pet e-commerce with one "Administrator".
2. **Scope correction** — the original concept note listed only 4 "nice-to-have" differentiators and was missing core e-commerce features (catalog, cart, payment, admin dashboard); those were added before the build started.
3. **Framing correction** — "Personalized Product Recommendation" was restated from implied AI/ML to explicitly **rule-based**, to avoid overselling at submission.
4. **Stack correction** — the note's "Backend: Supabase" conflated database with backend; corrected to Supabase (DB/Auth/Storage) + FastAPI (business logic).
5. **Multi-vendor pivot** (2026-08-12) — client confirmed a marketplace of independent stores; schema, permissions, and routing reworked.
6. **Admin authority narrowed** — from "manages everything" to oversight only; per-store product/order management moved fully to store owners.
7. **Seller onboarding corrected** — store creation moved from an admin-run CLI script per vendor to a public application-and-approval flow.
8. **Real payments** (2026-08-27 → 09-13) — Stripe added for verified card charges; KHQR upgraded from a static placeholder to a real generated QR with a scan-to-pay screen; manual admin confirmation dropped.
9. **Reward redemption upgraded** — the generic promo-code box (two hardcoded vouchers) was replaced by real per-customer loyalty redemption as the *sole* discount mechanism, matching the actual business: Paws Rewards is the platform's only promotion channel.
10. **Security hardening** — a full RLS audit late in the build found and fixed two real privilege-escalation gaps (role self-promotion; self-unbanning) via database triggers.
11. **Post-testing polish** (Sep 2026) — product options and reviews, promotion/discount detail, wishlist, upcoming stores, buy-now, full Cambodia address data, Vercel hosting config.

---

## 11. Build Phases & Status

Tracked task-by-task in repo-root `CHECKPOINT.md` — **every planned task is checked off.**

| Phase | Content | Status |
|---|---|---|
| **1** — Frontend (16 tasks) | Shell, home, catalog, detail, cart, checkout wizard, confirmation, tracking, auth pages, account, pets, admin shell/products/orders, collections, legal pages — all static/mock | ✅ |
| **2** — Backend foundation (4) | FastAPI structure, Supabase schema + RLS, Auth wiring with route guards, Storage | ✅ |
| **3** — Wiring (9) | Catalog, cart/checkout, tracking, pets, recommendations, loyalty, admin dashboard, admin orders, Docker Compose | ✅ |
| **3.10** — Marketplace pivot (10) | Stores schema, bootstrap/backfill, backend roles, store-owner frontend, public storefronts, single-store cart, seller intake, admin review, narrowed admin reach, store bans | ✅ |
| **3.11** | Reward redemption as a real checkout discount | ✅ |
| **4** — Payments (1) | Stripe + KHQR | ✅ |
| **5** — Testing (9) | Auth, catalog, cart/checkout, tracking, pets/recommendations, loyalty, admin/store-owner, RLS security spot-checks, cross-cutting (mobile, loading states, Docker boot) | ✅ |

**Test coverage at close:** 170 frontend tests across 17 spec files (stores, router guards, recommendations, admin dashboard, and view-level specs for account, checkout, confirmation, history, tracking, pets, catalog, detail, and all three store-owner views) and 69 backend tests across 5 files (`test_deps`, `test_loyalty`, `test_orders`, `test_route_security`). Linting and type-checking clean; the full stack verified booting from scratch via Docker Compose against live Supabase.

---

## 12. Deployment

- **Local dev** — `docker compose up` runs hot-reloading frontend (Vite, `:5173`) and backend (Uvicorn, `:8000`) containers against the hosted Supabase project. There is no local database container; Supabase is the one real datastore. Both sides can also run natively (`bun run dev` / `uv run uvicorn`) — not simultaneously with Docker, since they collide on the same ports.
- **Production** — frontend deploys to Vercel with SPA rewrites (`vercel.json`); a build-blocking `vue-tsc` error was fixed to unblock it.
- **Environment variables** — documented in `.env.example` on both sides, real secrets out of version control:
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
  - Backend: `SUPABASE_URL`, `SUPABASE_KEY` (service role), `CORS_ORIGINS`, `STRIPE_SECRET_KEY`
- **Operational scripts** (`backend/scripts/`) — `create_admin.py`, `create_store_owner.py`, `reset_password.py`, `seed_demo_stores.py`.

---

## 13. Repository Map

```
pawmart/
├── CHECKPOINT.md            # task-by-task build anchor (all phases checked off)
├── recap_pawmart.md         # original single-shop concept-note recap (historical)
├── doc_prep.md              # earlier report (superseded by this file)
├── doc-prep-pawmart.md      # this document
├── docker-compose.yml
├── frontend/                # Vue 3 + Vite + Element Plus
│   ├── src/views/           # shop, auth/, admin/, store/, __tests__/
│   ├── src/layouts/         # Default, Auth, AdminAuth, Admin, StoreOwner
│   ├── src/stores/          # auth, cart, pets, wishlist (Pinia)
│   ├── src/lib/             # supabase, products, orders, loyalty, pets,
│   │                        # recommendations, reviews, stores, storeApplications,
│   │                        # upcomingStores, adminDashboard, storage, stripe,
│   │                        # cambodiaAddress
│   └── src/data/            # cambodia-address.json (~1.8 MB)
├── backend/                 # FastAPI + uv
│   ├── src/backend/routers/ # products, categories, customers, orders,
│   │                        # loyalty, pet_profiles, storage, store_applications
│   ├── src/backend/core/    # config, deps (role gates), supabase client
│   ├── src/backend/services/# store_owner provisioning
│   ├── scripts/             # admin/store-owner/password/seed utilities
│   └── tests/               # pytest + fake Supabase client
└── supabase/migrations/     # 27 numbered SQL migrations
```
