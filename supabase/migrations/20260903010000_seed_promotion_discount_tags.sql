-- Demo data for the new is_promotional/is_discounted tags (task follow-up to
-- 20260903000000_product_promotion_tags.sql) -- a spread across stores/species
-- so the catalog filter and card badges have something to show.

update products set is_discounted = true
where slug in (
  'sisal-scratch-post',
  'riverside-40l-aquarium-filter-kit',
  'grain-free-chicken-kibble-3kg',
  'foldable-wire-crate-large'
);

update products set is_promotional = true
where slug in (
  'cloud-cushion-bed',
  'bamboo-aviary-cage-medium',
  'joint-support-chews',
  'travel-backpack-carrier'
);

-- One product carrying both tags, to check the badges stack cleanly.
update products set is_promotional = true, is_discounted = true
where slug = 'reflective-rain-jacket';
