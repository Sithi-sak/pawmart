# PawMart — Comprehensive Project Report

*Prepared as a reference document for concept notes, submissions, and project documentation.*

---

## 1. Executive Summary

PawMart is a full-stack, multi-vendor e-commerce marketplace for pet products (food, accessories, toys, grooming, and healthcare items). It was originally scoped as a single-shop freelance build and later pivoted into a marketplace model where independent sellers ("stores") run their own storefronts under one platform. The system is feature-complete end-to-end: customer shopping and checkout, seller/store-owner management tools, a platform admin oversight layer, real payment processing (Stripe for card payments, KHQR/Bakong QR for local Cambodian bank transfers), loyalty rewards, rule-based product recommendations, and a tested, containerized deployment.

- **Business context:** Freelance project built for a client/classmate (Chea Bunthay), who is paying for the work and owns the platform.
- **Category:** E-commerce web platform, pet-products vertical, multi-vendor marketplace model.
- **Status:** All planned phases (frontend, backend, integration, payments, testing) are checked off in the project's build checkpoint. The app is functionally complete and tested; a handful of documented, low-severity gaps remain (see Section 9).

---

## 2. Business Context & Problem Statement

### The problem
Pet owners often struggle to find reliable pet products and services in one place. Traditional pet shops have limited operating hours, restricted stock, and require an in-person visit — inconvenient for people who need food, toys, grooming supplies, or healthcare items on their own schedule.

### The solution
PawMart is a web-based marketplace where customers can browse, search, and buy pet products online at any time, from any of several independent sellers operating under one platform. Customers get a single consistent shopping/checkout/tracking experience regardless of which store they buy from; sellers get their own storefront and management dashboard without having to build their own e-commerce infrastructure; the platform owner gets oversight and a single payment collection point.

### Business/ownership model
- **Platform owner (Chea Bunthay):** owns and operates PawMart itself. Holds the platform admin role.
- **Store owners (sellers):** independent vendors who apply to sell on PawMart, get approved by the platform admin, and then run their own storefront (`/store/:slug`) — managing only their own products and orders.
- **Customers:** shop across all stores, with one account, one cart (see cart constraint below), one login, and one loyalty program spanning the whole platform.
- **Payments:** currently a *single shared payout destination* for the entire platform (Chea Bunthay's own bank/Stripe account) — "store" is a catalog/ownership/fulfillment grouping, not a separate payment split. Per-vendor payouts were explicitly deferred as out of scope.

### How the business model evolved
The project began as a single-shop concept (one catalog, one "Administrator" role managing everything). Partway through the build, the client confirmed the real intent was a **multi-vendor marketplace**: independent stores, each with an owner managing only their own products/orders, plus a public storefront per store, with the platform admin's role narrowed to oversight only (approving sellers, monitoring stores, banning bad actors) rather than day-to-day product/order management. This was a substantial architecture change (schema, permissions/RLS, routing, and already-built admin views all had to be reworked) — see Section 6 for the resulting role model and Section 10 for the full history of scope decisions.

---

## 3. Features

### Core e-commerce features
| Feature | Description |
|---|---|
| Product Catalog & Search | Browse all products by category (food, accessories, toys, grooming, healthcare); filter by pet type, brand, price range, store; sort and paginate. Detailed product pages with images, options, descriptions, stock, and reviews. |
| Shopping Cart & Checkout | Add to cart, adjust quantities, apply a loyalty-reward discount, and complete a 3-step checkout wizard (Shipping → Payment → Review) with a persistent order-summary sidebar. |
| Secure Payment | Visa/card payment via **Stripe** (PaymentIntent + Stripe Elements, PCI-compliant hosted fields), plus **KHQR/Bakong** QR payment scannable by any Cambodian banking app (ABA, ACLEDA, Wing, etc.), and an ABA PayWay informational panel. |
| Order Tracking | Post-purchase status timeline: Confirmed → Processing → Shipping → Out for Delivery → Delivered, plus full order history. |

### Differentiator features
| Feature | Description |
|---|---|
| Pet Profile Management | Customers register profiles for their pets (name, species, breed, age, weight, diet). |
| Personalized Product Recommendations | **Rule-based** (explicitly *not* AI/ML) filtering by pet species/age and purchase-history category affinity — deliberately framed this way to avoid overselling the feature. |
| Loyalty & Reward System | Points accrue automatically per paid order (5 points per $1 of subtotal after discount); customers redeem points for real rewards (dollar-value discounts or free shipping) applied directly as a checkout discount, not just a ledger debit. |
| Multi-vendor Marketplace | Independent seller storefronts, seller-application/approval workflow, store-owner dashboards, platform admin oversight, and a store ban mechanism. |

### Marketplace / seller features
- **Public storefront per store** (`/store/:slug`) with its own header and product grid; "Sold by {store}" links from catalog/product pages.
- **Seller application flow:** a public "Become a Seller" form (`/sell`) submits a request; the platform admin reviews, and can reject (with an optional note) or approve. Approval provisions a real login (Supabase Auth user + store row) and reveals a one-time temporary password for the admin to relay to the seller manually — no email-sending dependency.
- **Store-owner dashboard** (`/store/manage`): own-store product CRUD (including image upload), own-store order list and forward-only status updates, own-store sales overview and low-stock alerts, and an editable store profile (description/logo).
- **Platform admin oversight** (`/admin`): platform-wide aggregate stats (revenue/orders/average order value, read-only rollups), a read-only stores directory (owner, product/order counts), seller-application review, and the ability to ban/unban a store (which locks out the owner's sign-in and management access and removes the storefront from public view).
- **Single-store cart rule:** a cart may only contain items from one store at a time (adding a product from a different store prompts to clear the cart first) — a deliberate simplification instead of building multi-order/split-cart checkout.

---

## 4. User Roles & Permissions Model

| Role | Scope |
|---|---|
| **Guest / Customer** | Browse, buy, track own orders, manage own pet profiles, earn/redeem loyalty points. Signs in via email/password or Google OAuth. |
| **Store owner** | Full CRUD over only their own store's products; view/advance only their own store's orders (forward-only status transitions); edit their own store profile. Cannot see or touch any other store's data. |
| **Platform admin** | Store-level oversight only — *not* per-item product/order management. Reviews and approves/rejects seller applications; sees a read-only directory of all stores with aggregate counts; sees platform-wide read-only sales rollups; can ban/unban a store. Deliberately does **not** create/edit/delete another store's products or advance another store's orders (this authority was intentionally narrowed after the marketplace pivot). |

Admins and store owners both sign in through the same staff login screen, with the redirect target and available UI determined by role. Enforcement is layered: FastAPI backend routes gate by role via dependency injection (the backend uses a service-role key and bypasses Postgres RLS, so this is the real enforcement point for backend-mediated actions), while direct-from-frontend Supabase calls (e.g. product CRUD, seller applications) are enforced by Postgres Row-Level Security policies, including a role-column-lockdown trigger that prevents a customer from self-promoting to admin/store-owner via a crafted API call.

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue 3 (Composition API, `<script setup>`) |
| UI component library | Element Plus, with Phosphor icon set |
| State management | Pinia |
| Routing | Vue Router (role-aware navigation guards) |
| Frontend build tooling | Vite, TypeScript, ESLint + oxlint, Prettier |
| Frontend testing | Vitest + @vue/test-utils + happy-dom |
| Backend framework | Python, FastAPI |
| Backend package/dependency management | uv |
| Backend testing | pytest, with an in-memory fake Supabase client for unit tests |
| Database | Supabase (managed PostgreSQL) |
| Auth | Supabase Auth (email/password + Google OAuth for customers; email/password for staff) |
| File storage | Supabase Storage (product images) |
| Payments | Stripe (PaymentIntents + Stripe Elements) for card payments; KHQR/Bakong QR generation (client-side `qrcode` package) for local bank-app payments; ABA PayWay as an informational-only placeholder |
| Containerization | Docker + Docker Compose (dev-mode: hot-reloading frontend + backend containers against the hosted Supabase project) |
| Package runtime (JS) | Bun |
| Version control | Git + GitHub |

**Why this stack:** deliberately matched to another concurrent project ("Niyay") built by the same developer, so that boilerplate (auth setup, Docker config, Supabase connection patterns, KHQR integration) could be reused directly rather than re-derived, minimizing context-switching cost across two simultaneous freelance builds.

---

## 6. System Architecture

```
                        ┌─────────────────────┐
                        │   Vue 3 Frontend     │
                        │  (Vite, Pinia, ER+)  │
                        └─────────┬────────────┘
                                  │
                 ┌────────────────┼─────────────────┐
                 │                                    │
     Direct Supabase calls                 FastAPI Backend calls
   (RLS-enforced: catalog reads,           (service-role key, bypasses RLS;
    pet profiles, loyalty reads,            real business logic lives here:
    seller applications, most               order pricing/creation, stock
    product/store CRUD)                     decrement, forward-only order
                 │                          status transitions, Stripe
                 │                          verification, storage uploads,
                 │                          seller-application approval)
                 ▼                                    ▼
        ┌────────────────────────────────────────────────┐
        │            Supabase (Postgres + Auth +          │
        │                    Storage)                     │
        └────────────────────────────────────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Stripe (cards)   │
                        │  KHQR/Bakong (QR) │
                        └──────────────────┘
```

Two distinct write/read paths coexist by design: simple, RLS-safe CRUD (catalog, pet profiles, seller applications, most store/product management) goes straight from the Vue frontend to Supabase; anything with real cross-cutting business logic (cart pricing, stock checks, payment verification, order status sequencing, role provisioning) goes through the FastAPI backend, which holds the service-role key and is the actual enforcement point for those rules.

---

## 7. Data Model (Key Tables)

- **customers** — one row per user; `role` is `customer` / `store_owner` / `admin`; loyalty points balance lives here.
- **stores** — one row per seller; `status` (`active`/`banned`); owned by exactly one customer (`owner_id`).
- **products** — belongs to a `store_id` and `category`; has options, promotion/discount tags, and reviews.
- **categories**, **product_options**, **product_reviews**, **product promotion/discount tags** — catalog detail tables.
- **cart_items** — persisted per-customer cart (single-store constraint enforced in application logic, not a DB column).
- **orders / order_items / order_status_history** — order lifecycle, scoped to a `store_id`; status only ever advances forward.
- **loyalty_transactions / loyalty_rewards** — points earn/redeem ledger; rewards carry a `discount_amount` and/or `free_shipping` flag so a redemption is a real, machine-readable checkout discount.
- **store_applications** — public seller-signup intake queue (`pending`/approved/rejected), reviewed by the admin.
- **pet_profiles** — customer-owned pet records used to drive recommendations.

All tables are governed by Postgres Row-Level Security policies (customers/store owners/admin each scoped to what they should see), maintained as numbered migration files rather than ad-hoc SQL edits, with a security-hardening pass late in the build that closed two real privilege-escalation gaps (a customer being able to self-promote their own `role`, and a banned store owner being able to un-ban themselves) via database triggers.

---

## 8. Payments

- **Stripe (Visa/card):** the backend creates a `PaymentIntent` for a server-recomputed cart total; the frontend collects card details via Stripe Elements (never touching app state, so PCI scope stays minimal); an order is only ever created in the database *after* the backend independently re-verifies the PaymentIntent's status, amount, and owning customer against Stripe directly — the frontend's claim of success is never trusted blindly.
- **KHQR / Bakong:** a real KHQR QR code is generated client-side at checkout, encoding a link to an in-app "scan to confirm" screen that mimics a bank-app payment confirmation. Because there is no live Bakong webhook integration to gate on, the order is created and marked paid at the moment "Place Order" is clicked (same instant as a verified card charge) — a deliberate MVP decision, since building a manual-admin-confirmation step on top of an already-unverifiable payment would add friction without adding real verification. Funds settle to the platform owner's own bank account; per-vendor payout splitting is out of scope.
- **ABA PayWay:** presented as an informational panel only; full API-based automation was explicitly deferred as out of scope for this build.

---

## 9. Known Gaps & Deliberate Scope Limits

These are documented, intentional trade-offs rather than oversights:

- No per-vendor payout splitting — all payments settle to one shared account.
- No email delivery dependency anywhere in the system (seller approval hands off a one-time password in the admin UI instead of an emailed invite; no password-reset email verification testing either).
- A store owner who is banned mid-session keeps their session until they sign out (RLS/backend still block every read/write, so nothing leaks, but the UI degrades quietly rather than showing an explicit "you've been banned" message).
- Order status can be advanced multiple steps in one update (e.g. skipping "Processing" straight to "Delivered") — backward moves are blocked, but skip-ahead is allowed by design.
- Stock is enforced only at the backend pricing/order-creation step, not reactively in the cart UI itself.
- A customer can insert a fabricated line item into an order they already own via a direct RLS-permitted client call — low severity, since it can't affect any other customer's data or grant a refund/extra stock.
- Full automation of ABA PayWay is not built (informational-only placeholder).
- Mobile/responsive QA was done as a code-level audit (fixed-width dialogs and a flex-overflow bug were found and fixed), not a full manual visual pass across every breakpoint.

---

## 10. Project History / Key Decisions Timeline

1. **Initial concept:** single-shop pet e-commerce site with an "Administrator" role managing the whole catalog.
2. **Scope correction:** the original concept note only listed 4 "nice-to-have" differentiators and was missing core e-commerce features (catalog, cart, payment, admin dashboard) — these were added before build start.
3. **Framing correction:** "Personalized Product Recommendation" was corrected from an implied AI/ML feature to an explicitly rule-based one, to avoid overselling at submission.
4. **Payment correction:** the original note listed "Backend: Supabase," which conflated database and backend — corrected to Supabase (DB/Auth/Storage) + FastAPI (backend logic).
5. **Multi-vendor pivot:** the client confirmed PawMart should be a marketplace of independent stores rather than a single shop, requiring a schema, permissions, and routing rework.
6. **Admin authority narrowing:** the platform admin's role was tightened from "manages everything" to "oversight only" (seller approval, store directory, bans, aggregate stats), with per-store product/order management moved fully to store owners.
7. **Seller onboarding correction:** store creation moved from an admin-run CLI script for every new vendor to a public seller-application-and-approval flow, since manual provisioning for every seller wasn't realistic.
8. **Real payment integration:** Stripe added for verified card payments; KHQR upgraded from a static placeholder to a real generated QR with a scan-to-pay confirmation UI; the originally planned "admin manually confirms KHQR payment" step was dropped as adding friction without adding real verification.
9. **Reward redemption upgrade:** a generic promo-code discount box was replaced with real, per-customer loyalty-reward redemption as the sole discount mechanism (matching the actual business — this platform's only real promotion channel is Paws Rewards).
10. **Security hardening pass:** a full RLS policy audit late in the build found and fixed two real privilege-escalation vulnerabilities before they could be exploited in production.

---

## 11. Current Status

Per the project's build checkpoint, **every planned phase is complete**:
- Phase 1 — Frontend shell and all pages (static/mock data).
- Phase 2 — Backend foundation (FastAPI, Supabase schema, Auth, Storage).
- Phase 3 — Frontend ↔ backend wiring for every feature (catalog, cart/checkout, tracking, pet profiles, recommendations, loyalty, admin).
- Phase 3.10 — Full multi-vendor marketplace pivot (schema, roles, store-owner tooling, public storefronts, seller applications, admin oversight, store bans).
- Phase 4 — Real payment integration (Stripe + KHQR).
- Phase 5 — End-to-end testing pass across auth, catalog, cart/checkout, order tracking, pet profiles/recommendations, loyalty, admin, RLS/security spot-checks, and cross-cutting mobile/loading/Docker verification.

At the close of the testing phase: **157 frontend tests** and **54 backend tests** pass, linting and type-checking are clean (one pre-existing, unrelated TypeScript warning remains, tracked and not blocking), and the full stack was verified to boot cleanly from scratch via Docker Compose against the live Supabase project.

---

## 12. Deployment

- **Local/dev:** `docker compose up` runs hot-reloading frontend (Vite, port 5173) and backend (Uvicorn, port 8000) containers against the hosted Supabase project (no local database container — Supabase is the one real datastore). Alternatively, both sides can be run natively (`bun run dev` / `uv run uvicorn`) — not simultaneously with Docker, since they'd collide on the same ports.
- **Production hosting:** the frontend has been configured for hosting on Vercel (a build-blocking TypeScript error was fixed to unblock this).
- **Required environment variables:** Supabase URL/keys, Stripe secret/publishable keys — documented via `.env.example` files on both frontend and backend, with real secrets kept out of version control.
