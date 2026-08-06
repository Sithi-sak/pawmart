# PawMart — Origin Checkpoint

**How to use this file:** This is the anchor for the whole build. Work one task at a time. When a task is done, check it off here, commit, then `/clear` context and come back to this file to pick the next unchecked task. Don't jump ahead — later tasks assume earlier ones are done.

**Order of operations:** Frontend first (static UI, mock data, no backend calls) → Backend (Supabase schema, FastAPI endpoints) → wire frontend to backend feature-by-feature → ABA/KHQR payment integration is the last task, once everything else works end-to-end.

Current state: fresh `create-vue` + FastAPI scaffolds, no pages built, no schema, no auth wired.

---

## Phase 1 — Frontend (static, mock data, Element Plus)

- [x] **1.1 Project shell** — strip Vue starter boilerplate (HelloWorld/TheWelcome/WelcomeItem/icons, counter store), set up Element Plus globally, build base layout (header/nav/footer), configure router with all routes below as empty stub pages.
- [x] **1.2 Home / Landing** (`/`) — hero banner, featured products, category links.
- [x] **1.3 Product Catalog** (`/products`) — grid with filter/search by pet type, brand, price range (mock product data).
- [ ] **1.4 Product Detail** (`/products/:id`) — images, description, stock availability, add-to-cart.
- [ ] **1.5 Cart** (`/cart`) — line items, quantity adjust, voucher input, totals.
- [ ] **1.6 Checkout** (`/checkout`) — order summary + KHQR placeholder (static QR image/mock, no real generation yet).
- [ ] **1.7 Order Confirmation** (`/order/confirm`) — post-payment confirmation screen.
- [ ] **1.8 Order Tracking** (`/orders/:id`) — status timeline UI (Confirmed → Processing → Shipping → Out for Delivery → Delivered).
- [ ] **1.9 Login / Signup** (`/login`, `/signup`) — forms only, no auth wiring yet.
- [ ] **1.10 Account** (`/account`) — profile view/edit shell.
- [ ] **1.11 Pet Profiles** (`/account/pets`) — list + create/edit form (name, species, breed, age, weight, diet).
- [ ] **1.12 Admin Dashboard shell** (`/admin`) — protected-route layout, sales overview + low-stock alert widgets (mock data).
- [ ] **1.13 Admin Products** (`/admin/products`) — CRUD table/forms (mock data).
- [ ] **1.14 Admin Orders** (`/admin/orders`) — order list + status update UI (mock data).
- [ ] **1.15 Collections** (`/collections`) — category/collection landing grid (mock data), linked from nav.

## Phase 2 — Backend foundation

- [ ] **2.1 FastAPI app structure** — routers, settings via pydantic-settings, CORS, Supabase client init.
- [ ] **2.2 Supabase schema** — tables: products, categories, customers, pet_profiles, orders, order_items, loyalty_points/rewards; RLS policies.
- [ ] **2.3 Supabase Auth wiring** — real login/signup, session handling, protected route guard on frontend (admin vs customer roles).
- [ ] **2.4 Supabase Storage** — product image upload/serving.

## Phase 3 — Wire frontend ↔ backend (feature by feature)

- [ ] **3.1 Product Catalog & Search** — API + connect 1.3/1.4.
- [ ] **3.2 Cart & Checkout** — order creation API + connect 1.5/1.6/1.7.
- [ ] **3.3 Order Tracking** — status API + connect 1.8.
- [ ] **3.4 Pet Profile Management** — API + connect 1.11.
- [ ] **3.5 Rule-based Product Recommendations** — species/age/purchase-history filtering logic + surface on Home/Product pages (not AI/ML — see project memory).
- [ ] **3.6 Loyalty & Reward System** — points accrual/redemption API + connect to Account/Checkout.
- [ ] **3.7 Admin Dashboard** — product CRUD, inventory, low-stock alerts, sales overview API + connect 1.12/1.13.
- [ ] **3.8 Admin Orders** — order processing API + connect 1.14.
- [ ] **3.9 Docker Compose** — full stack (frontend, backend, and any local services) runnable with one command.

## Phase 4 — Payment (final task)

- [ ] **4.1 KHQR / Bakong payment (MVP, manual verification)** — generate KHQR QR code with Chea Bunthay's ABA bank details + order total at checkout; "I have paid" button; admin manual confirm in Admin Orders. (Full ABA PayWay API automation is out of scope for submission — see project memory.)

---

## Feature ↔ Task cross-reference

| Concept-note feature | Tasks |
|---|---|
| Product Catalog & Search | 1.3, 1.4, 3.1 |
| Collections | 1.15 |
| Shopping Cart & Checkout | 1.5, 1.6, 1.7, 3.2 |
| Secure Payment via KHQR | 4.1 |
| Admin Dashboard | 1.12, 1.13, 1.14, 3.7, 3.8 |
| Order Tracking | 1.8, 3.3 |
| Pet Profile Management | 1.11, 3.4 |
| Personalized Recommendations (rule-based) | 3.5 |
| Loyalty & Reward System | 3.6 |
