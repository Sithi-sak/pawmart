-- PawMart initial schema: products, categories, customers, pet_profiles,
-- orders, order_items, loyalty rewards/transactions, plus RLS policies.

create table categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table products (
  id bigint generated always as identity primary key,
  category_id bigint references categories(id) on delete set null,
  name text not null,
  brand text,
  species text,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  description text,
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on products (category_id);

-- One row per auth.users id; created on signup (wired in 2.3).
create table customers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  loyalty_points_balance integer not null default 0 check (loyalty_points_balance >= 0),
  created_at timestamptz not null default now()
);

create table pet_profiles (
  id bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  age numeric(4, 1),
  weight numeric(6, 2),
  diet text,
  created_at timestamptz not null default now()
);

create index pet_profiles_customer_id_idx on pet_profiles (customer_id);

create table orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'processing', 'shipping', 'out_for_delivery', 'delivered')),
  shipping_full_name text not null,
  shipping_phone text not null,
  shipping_street text not null,
  shipping_city text not null,
  shipping_postal_code text not null,
  shipping_method text not null check (shipping_method in ('standard', 'express')),
  shipping_cost numeric(10, 2) not null default 0,
  payment_method text not null check (payment_method in ('visa', 'aba_payway', 'khqr')),
  payment_status text not null default 'pending_confirmation'
    check (payment_status in ('paid', 'pending_confirmation')),
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on orders (customer_id);

create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  name text not null,
  variant text,
  sku text,
  price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on order_items (order_id);

create table loyalty_rewards (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ledger of points earned (type='earn', positive) and redeemed
-- (type='redeem', negative); customers.loyalty_points_balance is the
-- running total kept in sync when rows are inserted (task 3.6).
create table loyalty_transactions (
  id bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id bigint references orders(id) on delete set null,
  reward_id bigint references loyalty_rewards(id) on delete set null,
  points integer not null,
  type text not null check (type in ('earn', 'redeem')),
  created_at timestamptz not null default now()
);

create index loyalty_transactions_customer_id_idx on loyalty_transactions (customer_id);

-- security definer so admin checks inside RLS policies don't recurse
-- back through the customers table's own RLS.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from customers where id = auth.uid() and role = 'admin'
  );
$$;

alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table pet_profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table loyalty_rewards enable row level security;
alter table loyalty_transactions enable row level security;

create policy "categories are publicly readable" on categories
  for select using (true);
create policy "admins manage categories" on categories
  for all using (is_admin()) with check (is_admin());

create policy "products are publicly readable" on products
  for select using (true);
create policy "admins manage products" on products
  for all using (is_admin()) with check (is_admin());

create policy "customers view own profile" on customers
  for select using (auth.uid() = id or is_admin());
create policy "customers create own profile" on customers
  for insert with check (auth.uid() = id);
create policy "customers update own profile" on customers
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "customers manage own pets" on pet_profiles
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "admins view all pets" on pet_profiles
  for select using (is_admin());

create policy "customers view own orders" on orders
  for select using (auth.uid() = customer_id or is_admin());
create policy "customers create own orders" on orders
  for insert with check (auth.uid() = customer_id);
create policy "admins update orders" on orders
  for update using (is_admin()) with check (is_admin());

create policy "view items of accessible orders" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.customer_id = auth.uid() or is_admin())
    )
  );
create policy "insert items for own orders" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "active rewards are publicly readable" on loyalty_rewards
  for select using (is_active or is_admin());
create policy "admins manage rewards" on loyalty_rewards
  for all using (is_admin()) with check (is_admin());

create policy "customers view own loyalty transactions" on loyalty_transactions
  for select using (auth.uid() = customer_id or is_admin());
create policy "admins manage loyalty transactions" on loyalty_transactions
  for insert with check (is_admin());
