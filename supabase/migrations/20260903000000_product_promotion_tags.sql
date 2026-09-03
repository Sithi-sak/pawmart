-- Store-owner-set marketing tags: "Promotional" and "Discount" are plain
-- boolean flags (no computed price change) that a store owner toggles on
-- their own products, surfaced as a catalog filter + product card badge.

alter table products
  add column is_promotional boolean not null default false,
  add column is_discounted boolean not null default false;

-- Write access already covered by the existing "store owners manage own
-- products" RLS policy (whole-row UPDATE, no per-column grant list).
