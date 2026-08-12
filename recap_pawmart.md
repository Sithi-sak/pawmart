# PawMart — Project Recap
**Pet Shop E-Commerce Platform**

---

## 1. Project Identity

| Field | Detail |
|---|---|
| System name | PawMart |
| Student | Chea Bunthay |
| Type | Freelance — helping classmate, getting paid |
| Category | E-commerce web platform for pet products |
| Your role | Developer building the website |
| Deadline | 4 months (concept note) / target week 9 of your 90-day window |

---

## 2. Concept Note

### Short Description (20 words)
PawMart is a web-based pet shop platform that enables customers to purchase pet products conveniently anytime and anywhere.

### Long Description
Many pet owners face difficulties finding reliable pet products and services in one place. Traditional pet shops often have limited operating hours, restricted product availability, and require customers to visit physical stores. This can be inconvenient for busy pet owners who need quick access to pet food, accessories, toys, grooming products, and healthcare items. PawMart is a web-based pet shop e-commerce platform designed to provide a convenient and user-friendly shopping experience. The platform enables customers to browse products, search by category, view detailed product information, and place orders online. Users can create accounts, manage shopping carts, track orders, and make secure payments. Administrators manage products, inventory, customer information, and order processing through a dedicated dashboard.

### Features — All 8 (4 core + 4 differentiators)

> **Note:** Original concept note only had 4 "nice-to-have" features but was missing core ecommerce features. Added 4 core features below.

| Feature | Type | Description |
|---|---|---|
| Product Catalog & Search | Core | Browse all products by category (food, accessories, toys, grooming, healthcare). Filter by pet type, brand, price range. Detailed product pages with images, descriptions, stock availability. |
| Shopping Cart & Checkout | Core | Add products to cart, adjust quantities, apply discount vouchers, proceed to checkout. Order summary shown before payment confirmation. |
| Secure Payment via KHQR | Core | Customers pay via Bakong KHQR QR code — scannable by ABA, ACLEDA, Wing, or any Cambodian banking app. Manual verification for MVP. |
| Admin Dashboard | Core | Manage product listings, inventory, customer accounts, and order processing. Low stock alerts and sales overview included. |
| Order Tracking | Differentiator | After placing an order, customers view status updates: Order Confirmed → Processing → Shipping → Out for Delivery → Delivered. |
| Pet Profile Management | Differentiator | Customers create profiles for their pets (name, species, breed, age, weight, diet). Used to personalize the shopping experience. |
| Personalized Product Recommendation | Differentiator | Rule-based recommendations using pet profile and purchase history. NOT "AI-powered" — just smart filtering by pet type, age, frequently purchased categories. |
| Loyalty & Reward System | Differentiator | Earn points per successful order. Redeem for discounts, vouchers, promotions. Track accumulated points and reward history. |

### Deployment of Technology

> **Note:** Original concept note had "Backend: Supabase" which is WRONG. Supabase is a database, not a backend. Fixed below.

| Component | Technology |
|---|---|
| Frontend | Vue.js|
| UI Library | Element Plus |
| Backend | Python (FastAPI) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (product images) |
| Payment | KHQR (Bakong) |
| Containerization | Docker + Docker Compose |
| Version Control | Git + GitHub |

**Expected Completion Time:** 4 months

---

## 3. Important Feature Notes

### Recommendation Engine — Be Honest
The "Personalized Product Recommendation" sounds complex but is NOT a real ML recommendation engine. It is rule-based:
- Customer has a dog → show dog products
- Customer frequently buys puppy food → show senior dog food as they age
- Based on pet profile species + age + purchase history → filter relevant products

Frame it in the concept note as **"rule-based product recommendations"** not "AI-powered". Overselling this will cause problems at submission.

### KHQR Payment Flow
Money from PawMart purchases goes to **Chea Bunthay's bank account**, not yours. You need his bank account details (ABA account number) to generate the QR code. The MVP flow:

1. Customer selects products and proceeds to checkout
2. System generates KHQR QR code with his bank details and order total
3. Customer scans with their banking app and pays
4. Customer clicks "I have paid" button
5. Admin manually verifies in their bank app and marks order as confirmed
6. Full automation possible later via ABA PayWay API — not needed for submission

---

## 4. Your Development Approach

| Item | Decision |
|---|---|
| Stack | Identical to Niyay: Vue + FastAPI + Supabase — zero context switching |
| Boilerplate reuse | Auth setup, Docker config, Supabase connection, KHQR integration — copy from Niyay |
| AI assistance | Use Claude to generate entire page components, product CRUD, cart logic |
| Estimated time | 7-10 days of actual focused work with AI assistance |
| When to build | Week 9 of your 90-day plan — after Niyay core is working |
| Scope lock | Get Chea Bunthay to sign off on exact feature list before starting — no scope creep |

---

## 5. App Pages

| Page | Route | Notes |
|---|---|---|
| Home / Landing | / | Featured products, categories, hero banner |
| Product Catalog | /products | All products with filter/search |
| Product Detail | /products/:id | Single product page |
| Cart | /cart | Shopping cart management |
| Checkout | /checkout | Order summary + KHQR payment |
| Order Confirmation | /order/confirm | After payment |
| Order Tracking | /orders/:id | Status timeline |
| Account | /account | Profile + pet profiles |
| Pet Profiles | /account/pets | Manage pet profiles |
| Login / Signup | /login, /signup | Supabase Auth |
| Admin Dashboard | /admin | Protected route — admin only |
| Admin Products | /admin/products | CRUD product management |
| Admin Orders | /admin/orders | Order processing |
