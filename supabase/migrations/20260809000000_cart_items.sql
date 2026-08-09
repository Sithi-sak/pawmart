-- Server-side cart so items survive a refresh / follow the customer across
-- devices, instead of living only in the frontend's in-memory Pinia store.

create table cart_items (
  id bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index cart_items_customer_id_idx on cart_items (customer_id);

alter table cart_items enable row level security;

create policy "customers manage own cart" on cart_items
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
