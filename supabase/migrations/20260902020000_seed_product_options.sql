-- Demo option data for every existing product, so the option-picker UI has
-- something real to render. Driven by category rather than picked per
-- product one-by-one (60+ products across two seed migrations) -- each
-- category gets 1-2 option groups that make sense for the kind of item it
-- holds (apparel gets size+color, food gets weight, healthcare gets pack
-- size, etc.), giving different products genuinely different option sets.

insert into product_option_groups (product_id, name, sort_order)
select p.id, g.name, g.sort_order
from products p
join categories c on c.id = p.category_id
join (
  values
    ('pet-clothing-accessories', 'Size', 0),
    ('pet-clothing-accessories', 'Color', 1),
    ('pet-food', 'Weight', 0),
    ('pet-healthcare', 'Pack Size', 0),
    ('pet-grooming-supplies', 'Size', 0),
    ('pet-supplies', 'Size', 0),
    ('pet-supplies', 'Color', 1),
    ('pet-training-aids', 'Size', 0)
) as g(category_slug, name, sort_order) on g.category_slug = c.slug;

insert into product_option_values (group_id, value, sort_order)
select g.id, v.value, v.sort_order
from product_option_groups g
join (
  values
    ('Size', 'XS', 0), ('Size', 'S', 1), ('Size', 'M', 2), ('Size', 'L', 3), ('Size', 'XL', 4)
) as v(group_name, value, sort_order) on v.group_name = g.name
where g.name = 'Size';

insert into product_option_values (group_id, value, sort_order)
select g.id, v.value, v.sort_order
from product_option_groups g
join (
  values ('Black', 0), ('Grey', 1), ('Red', 2), ('Blue', 3)
) as v(value, sort_order) on true
where g.name = 'Color';

insert into product_option_values (group_id, value, sort_order)
select g.id, v.value, v.sort_order
from product_option_groups g
join (
  values ('500g', 0), ('1kg', 1), ('2.5kg', 2), ('5kg', 3)
) as v(value, sort_order) on true
where g.name = 'Weight';

insert into product_option_values (group_id, value, sort_order)
select g.id, v.value, v.sort_order
from product_option_groups g
join (
  values ('Single', 0), ('3-Pack', 1), ('6-Pack', 2)
) as v(value, sort_order) on true
where g.name = 'Pack Size';
