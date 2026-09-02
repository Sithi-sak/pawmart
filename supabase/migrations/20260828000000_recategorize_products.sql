-- Redesign of the product catalog taxonomy (checkpoint: catalog page redesign).
-- 1. Drop the two Small Pet seed products entirely (species tile removed from catalog).
-- 2. Replace the 4 ad-hoc categories with the new product-type taxonomy, remapping
--    existing products before dropping the old category rows.

delete from products where species = 'Small Pet';

insert into categories (name, slug) values
  ('Pet Clothing & Accessories', 'pet-clothing-accessories'),
  ('Pet Food', 'pet-food'),
  ('Pet Grooming Supplies', 'pet-grooming-supplies'),
  ('Pet Healthcare', 'pet-healthcare'),
  ('Pet Supplies', 'pet-supplies'),
  ('Pet Training Aids', 'pet-training-aids');

update products set category_id = (select id from categories where slug = 'pet-food')
  where category_id = (select id from categories where slug = 'food-nutrition');

update products set category_id = (select id from categories where slug = 'pet-grooming-supplies')
  where category_id = (select id from categories where slug = 'grooming-kit');

update products set category_id = (select id from categories where slug = 'pet-supplies')
  where category_id in (select id from categories where slug in ('bedding', 'toys'));

delete from categories where slug in ('food-nutrition', 'grooming-kit', 'bedding', 'toys');
