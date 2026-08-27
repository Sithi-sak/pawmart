-- Checkpoint 3.10.10: ban a store / store owner. Adds stores.status and
-- narrows owns_store()/public read policies so a banned store's owner loses
-- read+write access to their own store's products/orders, and the
-- storefront stops listing/serving the store -- same "fetch then gate on a
-- status column" pattern already used for loyalty_rewards' is_active check.

alter table stores add column status text not null default 'active'
  check (status in ('active', 'banned'));

-- owns_store() backs every store-owner product/order RLS policy (3.10.1),
-- and the backend's _owned_store_id() lookup (routers/orders.py) mirrors it
-- separately since the backend bypasses RLS -- gating this one function on
-- status is the single RLS choke point for "banned owner can't manage (or
-- see) their store's products/orders".
create or replace function public.owns_store(target_store_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from stores
    where id = target_store_id and owner_id = auth.uid() and status = 'active'
  );
$$;

-- stores: public/customers only see active stores; admin (to review/unban)
-- and the owner (to see their own banned state) still see the row.
drop policy "stores are publicly readable" on stores;
create policy "stores are publicly readable" on stores
  for select using (status = 'active' or is_admin() or owner_id = auth.uid());

-- products: same shape -- admin keeps the blanket read it already had for
-- the stores directory (3.10.9) and dashboard stats (3.7); everyone else
-- only sees products belonging to an active store.
drop policy "products are publicly readable" on products;
create policy "products are publicly readable" on products
  for select using (
    is_admin()
    or exists (select 1 from stores s where s.id = products.store_id and s.status = 'active')
  );
