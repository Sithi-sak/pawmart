-- Cambodian VAT (10%) replaces the 8.75% placeholder tax. Prices are VAT
-- inclusive, so nothing is added on top at checkout -- orders.tax now holds
-- the VAT already inside the price, and only for a store registered for VAT
-- with the GDT (an unregistered seller can't charge VAT at all).

alter table stores add column vat_registered boolean not null default false;

-- Whether a store charges VAT changes what every buyer's receipt says, so
-- like status it's admin-only: extend the 20260913020000 lockdown trigger
-- rather than trusting the "store owners update own store" policy.
create or replace function public.prevent_store_status_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.status <> old.status then
    raise exception 'Only an admin can change a store''s status';
  end if;
  if new.vat_registered <> old.vat_registered then
    raise exception 'Only an admin can change a store''s VAT registration';
  end if;
  return new;
end;
$$;
