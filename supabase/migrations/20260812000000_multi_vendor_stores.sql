-- Multi-vendor pivot, part 1 (checkpoint 3.10.1): stores table, widened
-- customers.role, owns_store() helper, and RLS scoping for store owners
-- alongside the existing platform-wide admin. products.store_id and
-- orders.store_id are added nullable here; they are backfilled and set
-- NOT NULL in a follow-up migration once a bootstrap store exists
-- (checkpoint 3.10.2), since a fresh migration can't create a real
-- auth.users-backed owner on its own.

create table stores (
  id bigint generated always as identity primary key,
  owner_id uuid not null unique references customers(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table customers drop constraint customers_role_check;
alter table customers add constraint customers_role_check
  check (role in ('customer', 'store_owner', 'admin'));

-- security definer so this can be used inside RLS policies (matches
-- is_admin() above) without recursing through stores'/customers' own RLS.
create function public.owns_store(target_store_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from stores where id = target_store_id and owner_id = auth.uid()
  );
$$;

alter table products add column store_id bigint references stores(id) on delete cascade;
create index products_store_id_idx on products (store_id);

alter table orders add column store_id bigint references stores(id);
create index orders_store_id_idx on orders (store_id);

alter table stores enable row level security;

create policy "stores are publicly readable" on stores
  for select using (true);
create policy "store owners update own store" on stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admins manage stores" on stores
  for all using (is_admin()) with check (is_admin());

-- products: platform admin keeps blanket access; store owners get the
-- same blanket access scoped to only their own store's rows.
drop policy "admins manage products" on products;
create policy "admins manage products" on products
  for all using (is_admin()) with check (is_admin());
create policy "store owners manage own products" on products
  for all using (owns_store(store_id)) with check (owns_store(store_id));

-- orders: a store owner may see/update orders placed against their store,
-- same shape as the existing admin allowances.
drop policy "customers view own orders" on orders;
create policy "customers view own orders" on orders
  for select using (auth.uid() = customer_id or is_admin() or owns_store(store_id));

drop policy "admins update orders" on orders;
create policy "admins update orders" on orders
  for update using (is_admin() or owns_store(store_id)) with check (is_admin() or owns_store(store_id));

-- order_items / order_status_history: extend the existing "accessible
-- order" join to also cover the order's store owner.
drop policy "view items of accessible orders" on order_items;
create policy "view items of accessible orders" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.customer_id = auth.uid() or is_admin() or owns_store(o.store_id))
    )
  );

drop policy "view history of accessible orders" on order_status_history;
create policy "view history of accessible orders" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.customer_id = auth.uid() or is_admin() or owns_store(o.store_id))
    )
  );

drop policy "admins insert order status history" on order_status_history;
create policy "admins insert order status history" on order_status_history
  for insert with check (is_admin() or owns_store((select store_id from orders where id = order_id)));

-- product image storage: broaden from admin-only to any store owner too.
-- The bucket has no per-owner path scoping (uploaded filenames are random
-- UUIDs, see backend storage router), so this is store-owner-vs-store-owner
-- trust, same as today's admin-only trust level -- acceptable for the MVP.
drop policy "admins manage product images" on storage.objects;
create policy "staff manage product images"
  on storage.objects for all
  using (
    bucket_id = 'product-images'
    and (public.is_admin() or exists (
      select 1 from customers where id = auth.uid() and role = 'store_owner'
    ))
  )
  with check (
    bucket_id = 'product-images'
    and (public.is_admin() or exists (
      select 1 from customers where id = auth.uid() and role = 'store_owner'
    ))
  );
