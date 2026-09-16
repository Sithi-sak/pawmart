-- Marketing teaser list for stores that are launching soon but don't have a
-- real store account yet (no owner, no products) -- admin-managed, shown as
-- a "Coming Soon" list under the catalog's Store filter.
create table upcoming_stores (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  description text,
  launch_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table upcoming_stores enable row level security;

create policy "anyone can view upcoming stores" on upcoming_stores
  for select using (true);

create policy "admins manage upcoming stores" on upcoming_stores
  for all using (is_admin()) with check (is_admin());
