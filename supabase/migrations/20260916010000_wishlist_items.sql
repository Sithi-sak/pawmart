-- Server-side wishlist, mirroring cart_items (20260809000000) so saved
-- products survive a refresh and follow the customer across devices.

create table wishlist_items (
  id bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index wishlist_items_customer_id_idx on wishlist_items (customer_id);

alter table wishlist_items enable row level security;

create policy "customers manage own wishlist" on wishlist_items
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
