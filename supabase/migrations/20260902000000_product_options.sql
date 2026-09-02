-- Product options (product detail page upgrade): each product can carry
-- N option groups (e.g. "Size", "Color", "Weight"), each with an ordered
-- list of selectable values -- generic enough to cover the very different
-- variant shapes across categories (apparel size/color, food weight,
-- healthcare pack size, etc.) without a fixed schema per attribute.
--
-- Read/write access mirrors products itself: publicly readable, writable
-- only by the store owner who owns the parent product (products lost the
-- admin write grant in 20260814000000_narrow_admin_product_order_writes.sql,
-- so options follow the same store-owner-only write authority).

create table product_option_groups (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table product_option_values (
  id bigint generated always as identity primary key,
  group_id bigint not null references product_option_groups(id) on delete cascade,
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_option_groups_product_id_idx on product_option_groups (product_id);
create index product_option_values_group_id_idx on product_option_values (group_id);

alter table product_option_groups enable row level security;
alter table product_option_values enable row level security;

create policy "product options are publicly readable" on product_option_groups
  for select using (true);
create policy "store owners manage own product options" on product_option_groups
  for all using (
    exists (select 1 from products p where p.id = product_id and owns_store(p.store_id))
  )
  with check (
    exists (select 1 from products p where p.id = product_id and owns_store(p.store_id))
  );

create policy "product option values are publicly readable" on product_option_values
  for select using (true);
create policy "store owners manage own product option values" on product_option_values
  for all using (
    exists (
      select 1 from product_option_groups g
      join products p on p.id = g.product_id
      where g.id = group_id and owns_store(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from product_option_groups g
      join products p on p.id = g.product_id
      where g.id = group_id and owns_store(p.store_id)
    )
  );
