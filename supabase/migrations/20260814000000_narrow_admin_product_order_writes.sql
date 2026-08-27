-- Checkpoint 3.10.9: lock in the narrower admin/store-owner authority split
-- (see CHECKPOINT.md 2026-08-14 scope note). Admin keeps platform-wide
-- read access (needed for the new /admin/stores directory and the existing
-- dashboard aggregate stats, task 3.7) but loses write access to individual
-- stores' products and orders -- that's store-owner-only now.

-- products: "products are publicly readable" already covers admin's read
-- need for the stores directory's product counts, so drop the write grant
-- outright rather than replacing it with a narrower one.
drop policy "admins manage products" on products;

-- orders: admin could previously update any order's status alongside a
-- store owner updating their own; narrow to store-owner-only.
drop policy "admins update orders" on orders;
create policy "store owners update own orders" on orders
  for update using (owns_store(store_id)) with check (owns_store(store_id));
