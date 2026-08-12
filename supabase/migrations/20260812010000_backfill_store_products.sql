-- Multi-vendor pivot, part 2 (checkpoint 3.10.2): backfill store_id for the
-- pre-pivot data now that a bootstrap store owner exists (created via
-- scripts/create_store_owner.py with slug 'pawmart-flagship' -- run that
-- script BEFORE applying this migration, or the updates below are no-ops
-- and the not-null constraints will fail).
--
-- Everything created before the pivot (the 16 seeded products, and any
-- orders placed against them) belonged to the single original shop, so it
-- all backfills onto this one bootstrap store.

update products
set store_id = (select id from stores where slug = 'pawmart-flagship')
where store_id is null;

alter table products alter column store_id set not null;

update orders
set store_id = (select id from stores where slug = 'pawmart-flagship')
where store_id is null;

alter table orders alter column store_id set not null;
