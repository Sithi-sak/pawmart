-- Product reviews (product detail page upgrade): a signed-in customer can
-- leave one star rating + comment per product, shown immediately (no
-- moderation queue). `reviewer_name` is a denormalized snapshot of the
-- customer's full_name at submission time rather than an embedded join
-- through customers -- customers' own RLS ("customers view own profile")
-- only lets a user read their own row, so a `customers(full_name)` embed
-- would come back null for every other reviewer; order_items already
-- denormalizes name/variant/sku for the same reason (see init schema).

create table product_reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create index product_reviews_product_id_idx on product_reviews (product_id);

alter table product_reviews enable row level security;

create policy "product reviews are publicly readable" on product_reviews
  for select using (true);
create policy "customers create own reviews" on product_reviews
  for insert with check (auth.uid() = customer_id);
