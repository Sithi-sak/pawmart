-- Checkpoint 5.8 security spot-check findings. RLS policies gate whole
-- rows, not individual columns, so a policy that lets a user write "their
-- own row" can accidentally let them write ANY column on it -- including
-- ones that grant privilege. Two existing policies had exactly that hole:
--
-- 1. "customers update own profile" (init schema) only checked
--    auth.uid() = id, so a plain customer could
--    `supabase.from('customers').update({ role: 'admin' }).eq('id', me)`
--    and self-promote -- nothing ever checked the role column itself.
--    Same gap on insert (a crafted signup insert could set role directly).
-- 2. "store owners update own store" (multi-vendor pivot) only checked
--    owner_id = auth.uid(), so a BANNED store owner could
--    `supabase.from('stores').update({ status: 'active' }).eq('id', mine)`
--    and undo 3.10.10's ban entirely -- owns_store()'s status='active'
--    check guards products/orders access, but never guarded this policy.
--
-- RLS can't express "this column may only change if X" directly, so both
-- are locked down with a BEFORE trigger instead. Backend writes to these
-- columns (store_owner.py's service-role upsert on approval, service-role
-- key bypasses RLS but not triggers) still need to work, so both triggers
-- also allow auth.role() = 'service_role' through.

create or replace function public.prevent_customer_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role <> 'customer' then
      raise exception 'Cannot set role on signup';
    end if;
  elsif new.role <> old.role then
    raise exception 'Only an admin can change a customer''s role';
  end if;

  return new;
end;
$$;

drop trigger if exists customers_prevent_role_self_escalation on customers;
create trigger customers_prevent_role_self_escalation
  before insert or update on customers
  for each row execute function public.prevent_customer_role_self_escalation();

create or replace function public.prevent_store_status_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status and not (is_admin() or auth.role() = 'service_role') then
    raise exception 'Only an admin can change a store''s status';
  end if;
  return new;
end;
$$;

drop trigger if exists stores_prevent_status_self_change on stores;
create trigger stores_prevent_status_self_change
  before update on stores
  for each row execute function public.prevent_store_status_self_change();

-- Neither of these write policies has ever had a real caller: order status
-- changes go exclusively through the backend's PATCH /api/orders/{id}/status
-- (service-role key, bypasses RLS, enforces the forward-only sequence in
-- ORDER_STATUSES) and it writes order_status_history itself the same way --
-- no frontend code performs either write directly. Left in place, both let
-- an active store owner bypass the backend's forward-only check entirely
-- (jump straight to "delivered", or flip payment_status/subtotal/total on
-- their own store's orders) or forge a status-history row for an order
-- whose status was never actually changed. Dropped outright rather than
-- narrowed, same reasoning already used for "admins manage products" in
-- 20260814000000_narrow_admin_product_order_writes.sql.
drop policy "store owners update own orders" on orders;
drop policy "admins insert order status history" on order_status_history;
