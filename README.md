# PawMart

PawMart is a multi-vendor e-commerce marketplace for pet products (food, accessories, toys, grooming and healthcare). Customers shop across independent stores with one account, cart and loyalty program. Store owners run their own storefronts and dashboards. A platform admin approves sellers and oversees the marketplace.

## Features

- **Catalog and search.** Browse by category, then filter by pet type, brand, price and store. Product pages show options, reviews and promotion/discount badges.
- **Cart, wishlist and checkout.** Both the cart and the wishlist are saved on the server. Checkout is a 3-step wizard (Shipping → Payment → Review) with Cambodian address selection (province → district → commune → village) and zoned shipping.
- **Payments (simulated).** You can pay with a Visa card or with a KHQR QR code. The QR code opens an in-app confirm page. No real payment provider is involved.
- **Order tracking.** Each order shows a status timeline (Confirmed → Processing → Shipping → Out for Delivery → Delivered), and customers can see their full order history.
- **Pet profiles and recommendations.** Customers register their pets. Product recommendations are rule-based: they rank by species match, then purchase-category affinity, then newness.
- **Paws Rewards loyalty.** Customers earn 5 points per $1 on paid orders and can redeem points for a checkout discount or free shipping.
- **Multi-vendor tools:**
  - Public seller application at `/sell`.
  - Admin review of seller applications, which provisions an account with a one-time password.
  - Store-owner dashboard at `/store/manage`, where owners manage their store's products, orders and profile.
  - Public storefronts at `/store/:slug`.
  - Store bans, and an "upcoming stores" list.
- **Mobile PWA.** The app installs as a mobile PWA (manifest and service worker) with a mobile-first layout.

### Roles

| Role | Can do |
|---|---|
| Customer | Shop, check out, track orders, and manage pets, wishlist and loyalty points. Signs in with email/password or Google. |
| Store owner | Full CRUD on **their own** store's products. View and advance **their own** store's orders. Edit their own store profile. |
| Platform admin | Approve or reject sellers, ban or unban stores, manage upcoming stores, and view platform-wide stats. Cannot edit another store's products. |

Admins and store owners sign in at `/admin/login`. Customers sign in at `/login`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + TypeScript, Vite, Element Plus, Pinia, Vue Router, Phosphor icons |
| Backend | Python 3.11, FastAPI, managed with [uv](https://docs.astral.sh/uv/) |
| Database / Auth / Storage | [Supabase](https://supabase.com) (PostgreSQL with Row-Level Security, Supabase Auth, Supabase Storage) |
| JS runtime / package manager | [Bun](https://bun.sh) |
| Tests | Vitest + @vue/test-utils (frontend), pytest (backend) |
| Containers | Docker + Docker Compose (optional) |
| Hosting | Vercel for the frontend (`frontend/vercel.json`); any Docker host for the backend |

## Project structure

```
pawmart/
├── backend/                 FastAPI service (orders, loyalty, storage uploads, seller approval)
│   ├── src/backend/
│   │   ├── main.py          App entry point (CORS, routers, /health)
│   │   ├── core/            Settings, Supabase client, auth/role dependencies
│   │   ├── routers/         API routes
│   │   └── services/        Shared business logic (store-owner provisioning)
│   ├── scripts/             One-off admin scripts (create admin, store owner, demo stores, reset password)
│   ├── tests/               pytest suite (uses an in-memory fake Supabase client)
│   ├── pyproject.toml
│   └── .env.example
├── frontend/                Vue 3 single-page app
│   ├── src/
│   │   ├── views/           Pages (customer, auth, admin/, store/)
│   │   ├── components/      Shared UI components
│   │   ├── layouts/         Customer / admin / store-owner layouts
│   │   ├── stores/          Pinia stores (auth, cart, pets, wishlist)
│   │   ├── lib/             Data access and helpers (Supabase queries, API calls, formatting)
│   │   ├── router/          Routes and role-aware navigation guards
│   │   └── data/            Static data (Cambodia address dataset)
│   ├── public/              PWA manifest, service worker, icons
│   ├── package.json
│   └── .env.example
├── supabase/
│   ├── config.toml          Supabase CLI config
│   └── migrations/          Numbered SQL migrations (schema, RLS policies, seed data)
├── docker-compose.yml       Runs backend + frontend in dev mode
└── package.json             Pins the Supabase CLI (used via `bunx supabase`)
```

### How the pieces talk

- The **frontend** reads and writes most data **directly from Supabase** with the public anon key: catalog, pet profiles, wishlist, cart, product CRUD for store owners, and seller applications. Postgres Row-Level Security policies decide what each user can do.
- The **backend** holds the Supabase **service-role key** and handles everything that must be trusted or needs admin rights:
  - placing orders and calculating totals
  - order status changes
  - loyalty redemption
  - product image uploads
  - approving seller applications (which creates Supabase Auth users)

  The frontend calls the backend at `VITE_API_BASE_URL` and sends the user's Supabase access token.

---

## Setup

### 1. Prerequisites

Install the following:

- **[Bun](https://bun.sh)** 1.x, for the frontend and the Supabase CLI. Node.js is not required.
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)**, for the backend. uv installs Python 3.11 automatically if it is missing.
- A **Supabase project**. A free tier at [supabase.com](https://supabase.com) is enough.
- *(Optional)* **Docker + Docker Compose**, if you want to run the app in containers.

### 2. Get the Supabase keys

In the Supabase dashboard, open your project and go to **Project Settings → API**. Note these values:

| Value | Used in |
|---|---|
| Project URL (`https://<ref>.supabase.co`) | Both `.env` files |
| `anon` / publishable key | `frontend/.env` |
| `service_role` / secret key | `backend/.env` only. **Never put it in the frontend.** |

Your **project ref** is the `<ref>` part of the URL. You need it in step 4.

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
CORS_ORIGINS=["http://localhost:5173"]
```

`CORS_ORIGINS` is a JSON list. Add your deployed frontend URL to it when you deploy.

**`frontend/.env`**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Install dependencies

```bash
# Repo root: installs the Supabase CLI
bun install

# Frontend
cd frontend && bun install && cd ..

# Backend: creates backend/.venv with all dependencies, including dev tools
cd backend && uv sync && cd ..
```

### 5. Set up the database

Every schema change, RLS policy and seed row is a numbered migration in `supabase/migrations/`. Apply them with the Supabase CLI. Don't paste ad-hoc SQL into the dashboard.

First, link the CLI to your project. It asks for the database password you set when you created the project.

```bash
bunx supabase login
bunx supabase link --project-ref <your-project-ref>
```

**You can't apply all the migrations in one step.** Two migrations depend on rows that only a backend script can create, because those rows need real Supabase Auth users:

| Migration | Needs this to run first |
|---|---|
| `20260812010000_backfill_store_products.sql` | `create_store_owner.py` with slug `pawmart-flagship`, which owns the original 16 seeded products |
| `20260829000000_seed_demo_marketplace_products.sql` | `seed_demo_stores.py`, which creates the 6 demo stores the products are seeded into |

If you skip a script, its migration fails or seeds nothing. Use this staged procedure, running every command from the repo root. It holds back the later migrations, then restores them in batches:

```bash
# Hold back every migration newer than 20260812000000 (the multi-vendor schema)
mkdir -p /tmp/pawmart-held
for f in supabase/migrations/*.sql; do
  ts=$(basename "$f" | cut -c1-14)
  (( ts > 20260812000000 )) && mv "$f" /tmp/pawmart-held/
done

# Stage A: base schema, seed products, and the stores table
bunx supabase db push
```

```bash
# Create the flagship store owner (run from backend/)
cd backend
uv run python scripts/create_store_owner.py owner@example.com '<password>' "PawMart Flagship Store" pawmart-flagship "Flagship Owner"
cd ..

# Stage B: restore migrations older than the demo marketplace seed (20260829000000), then push
for f in /tmp/pawmart-held/*.sql; do
  ts=$(basename "$f" | cut -c1-14)
  (( ts < 20260829000000 )) && mv "$f" supabase/migrations/
done
bunx supabase db push
```

```bash
# Create the 6 demo stores (they all share the password you pass here)
cd backend
uv run python scripts/seed_demo_stores.py '<demo-password>'
cd ..

# Stage C: restore the remaining migrations, then push
mv /tmp/pawmart-held/* supabase/migrations/
bunx supabase db push

# Check: every local migration should show a matching remote timestamp
bunx supabase migration list
```

Before you continue, check that `supabase/migrations/` holds all of its files again.

> If you don't need the demo stores, you can still run Stage C without `seed_demo_stores.py`. The demo-product migration then inserts nothing, and the marketplace starts with only the flagship store.

### 6. Create an admin account

```bash
cd backend
uv run python scripts/create_admin.py admin@example.com '<password>' "Platform Admin"
```

You can safely re-run this script. To change the password of an existing admin or store owner, run:

```bash
uv run python scripts/reset_password.py <email> '<new-password>'
```

### 7. *(Optional)* Enable Google sign-in

Customers can sign in with Google. To turn it on:

1. In Supabase, go to **Authentication → Providers → Google**.
2. Enable the provider and enter the client ID and secret of a Google OAuth client.
3. Under **Authentication → URL Configuration**, add `http://localhost:5173` (and your production URL) to the redirect URLs.

Email/password sign-in works without this step.

### 8. Run the app

**Option A: run locally (two terminals)**

```bash
# Terminal 1: backend on http://localhost:8000 (interactive API docs at /docs)
cd backend
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2: frontend on http://localhost:5173
cd frontend
bun run dev
```

**Option B: Docker Compose**

```bash
docker compose up --build
```

This starts both services with hot reload, using the same ports (backend `8000`, frontend `5173`). Each service reads its own `.env` file.

Open **http://localhost:5173**. Where to go next:

- Shop as a customer: sign up at `/signup`.
- Sign in as the admin: use the account from step 6 at `/admin/login`.
- Sign in as a store owner: use an account from step 5 at `/admin/login` (it redirects to `/store/manage`).

---

## Development

### Frontend (`frontend/`)

| Command | Purpose |
|---|---|
| `bun run dev` | Dev server with hot reload |
| `bun run type-check` | Type-check with `vue-tsc` |
| `bun run lint` | oxlint + ESLint (auto-fixes) |
| `bun run format` | Prettier on `src/` |
| `bun run test` | Vitest unit/component tests |
| `bun run build` | Type-check + production build to `dist/` |
| `bun run preview` | Serve the production build locally |

### Backend (`backend/`)

| Command | Purpose |
|---|---|
| `uv run uvicorn backend.main:app --reload` | Dev server |
| `uv run pytest` | Run the test suite. It doesn't need a Supabase connection. |
| `uv run ruff check .` / `uv run ruff format .` | Lint / format |

### Database changes

To change the schema, add a new timestamped file in `supabase/migrations/` (for example `20261005000000_my_change.sql`), then run `bunx supabase db push`. Never edit migrations that have already been applied.

---

## Deployment

- **Frontend:** deploy `frontend/` to Vercel or any static host.
  - Build command: `bun run build`.
  - Output directory: `dist`.
  - Set the three `VITE_*` variables in the host's environment settings, with `VITE_API_BASE_URL` pointing at the deployed backend.
  - `vercel.json` already rewrites every route to `index.html`, so client-side routing works.
- **Backend:** build `backend/Dockerfile` and run it on any container host (Render, Railway, Fly.io and so on).
  - It listens on `$PORT` (default `8000`).
  - Set `SUPABASE_URL`, `SUPABASE_KEY` and `CORS_ORIGINS`, and include the deployed frontend URL in `CORS_ORIGINS`.
- **Supabase:** add the production frontend URL to **Authentication → URL Configuration** (Site URL and redirect URLs).

## Troubleshooting

| Problem | Fix |
|---|---|
| Browser shows CORS errors when it calls the API | Add the frontend origin to `CORS_ORIGINS` in `backend/.env` (JSON list), then restart the backend. |
| `db push` fails at `backfill_store_products` with a NOT NULL violation | The `pawmart-flagship` store doesn't exist yet. Run `create_store_owner.py` (step 5, Stage B), then push again. |
| The catalog shows no demo-store products | `seed_demo_stores.py` hadn't run when the demo seed migration ran. Run the script, then re-run that migration's SQL in the SQL editor, or reset and re-apply the migrations. |
| An account can't get into `/admin` or `/store/manage` | The account's `customers.role` is not `admin` or `store_owner`. Re-run `create_admin.py` or `create_store_owner.py` for that email. |
| A store owner is locked out | Their store is banned. Unban it at `/admin/stores`. |
| `vue-tsc` fails on `.vue` imports when run under Bun | Keep the `*.vue` module declaration in `frontend/env.d.ts`. |
