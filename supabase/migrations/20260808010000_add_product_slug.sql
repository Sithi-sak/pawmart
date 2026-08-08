-- Task 3.1 follow-up: slug-based product URLs instead of raw numeric ids.

alter table products add column slug text;

update products set slug = 'plush-nest-bed' where name = 'Plush Nest Bed';
update products set slug = 'elevated-feeding-stand' where name = 'Elevated Feeding Stand';
update products set slug = 'woven-leather-leash-set' where name = 'Woven Leather Leash Set';
update products set slug = 'sisal-scratch-post' where name = 'Sisal Scratch Post';
update products set slug = 'grooming-brush-kit' where name = 'Grooming Brush Kit';
update products set slug = 'gourmet-chicken-wild-salmon' where name = 'Gourmet Chicken & Wild Salmon';
update products set slug = 'cloud-cushion-bed' where name = 'Cloud Cushion Bed';
update products set slug = 'feather-wand-toy' where name = 'Feather Wand Toy';
update products set slug = 'aviary-perch-set' where name = 'Aviary Perch Set';
update products set slug = 'freshwater-tank-filter' where name = 'Freshwater Tank Filter';
update products set slug = 'small-pet-hideaway-hut' where name = 'Small Pet Hideaway Hut';
update products set slug = 'salmon-pumpkin-bites' where name = 'Salmon & Pumpkin Bites';
update products set slug = 'nail-trimmer-file-set' where name = 'Nail Trimmer & File Set';
update products set slug = 'bird-nutrition-blend' where name = 'Bird Nutrition Blend';
update products set slug = 'deluxe-chew-rope' where name = 'Deluxe Chew Rope';
update products set slug = 'small-pet-grooming-kit' where name = 'Small Pet Grooming Kit';

alter table products alter column slug set not null;
alter table products add constraint products_slug_key unique (slug);
