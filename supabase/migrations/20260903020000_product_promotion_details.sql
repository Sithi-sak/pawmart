-- Follow-up to 20260903000000_product_promotion_tags.sql: the boolean tags
-- alone weren't enough to actually communicate the promotion/discount to a
-- shopper, so store owners now attach real details -- a percentage for a
-- discount, free text for a promotion (e.g. "Buy One Get One Free").

alter table products
  add column discount_percent numeric(5, 2),
  add column promotion_note text;

-- Backfill the demo rows tagged in 20260903010000_seed_promotion_discount_tags.sql
-- (is_discounted with no percent yet) before the not-null-when-discounted
-- constraint below can be added.
update products set discount_percent = 25 where slug = 'sisal-scratch-post';
update products set discount_percent = 15 where slug = 'riverside-40l-aquarium-filter-kit';
update products set discount_percent = 20 where slug = 'grain-free-chicken-kibble-3kg';
update products set discount_percent = 30 where slug = 'foldable-wire-crate-large';
update products set discount_percent = 40 where slug = 'reflective-rain-jacket';

update products set promotion_note = 'Buy One Get One Free' where slug = 'reflective-rain-jacket';
update products set promotion_note = 'Limited-time launch promotion' where slug = 'cloud-cushion-bed';
update products set promotion_note = 'Featured this month' where slug = 'bamboo-aviary-cage-medium';
update products set promotion_note = 'Free consult with purchase' where slug = 'joint-support-chews';
update products set promotion_note = 'Bundle with a travel bowl at no extra cost' where slug = 'travel-backpack-carrier';

alter table products
  add constraint discount_percent_range check (
    discount_percent is null or (discount_percent > 0 and discount_percent <= 90)
  ),
  add constraint discount_requires_percent check (
    not is_discounted or discount_percent is not null
  );
