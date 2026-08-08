-- Task 3.1: seed categories and products so the catalog has real data to render.

insert into categories (name, slug) values
  ('Food & Nutrition', 'food-nutrition'),
  ('Bedding', 'bedding'),
  ('Toys', 'toys'),
  ('Grooming Kit', 'grooming-kit');

insert into products (category_id, name, brand, species, price, stock, description, is_new) values
  ((select id from categories where slug = 'bedding'), 'Plush Nest Bed', 'Nordic Home', 'Dog', 345.00, 12, 'A cushioned nest bed with raised sides for dogs that like to curl up.', true),
  ((select id from categories where slug = 'food-nutrition'), 'Elevated Feeding Stand', 'Timber & Co', 'Dog', 180.00, 20, 'Raised feeding stand that eases strain on the neck and joints during meals.', false),
  ((select id from categories where slug = 'toys'), 'Woven Leather Leash Set', 'WildRoots', 'Dog', 210.00, 15, 'Hand-woven leather leash and collar set built for daily walks.', false),
  ((select id from categories where slug = 'toys'), 'Sisal Scratch Post', 'Timber & Co', 'Cat', 540.00, 8, 'Tall sisal-wrapped scratching post with a stable base.', false),
  ((select id from categories where slug = 'grooming-kit'), 'Grooming Brush Kit', 'PawMart Collection', 'Dog', 125.00, 30, 'A complete brush and comb set for regular coat care.', false),
  ((select id from categories where slug = 'food-nutrition'), 'Gourmet Chicken & Wild Salmon', 'Fresh Fields', 'Cat', 45.00, 50, 'Grain-free wet food made with real chicken and wild-caught salmon.', false),
  ((select id from categories where slug = 'bedding'), 'Cloud Cushion Bed', 'Nordic Home', 'Cat', 96.00, 18, 'A soft, machine-washable cushion bed for cats.', false),
  ((select id from categories where slug = 'toys'), 'Feather Wand Toy', 'WildRoots', 'Cat', 22.00, 40, 'An interactive feather wand toy for play sessions.', true),
  ((select id from categories where slug = 'bedding'), 'Aviary Perch Set', 'Timber & Co', 'Bird', 68.00, 22, 'Natural wood perches sized for small to medium birds.', false),
  ((select id from categories where slug = 'food-nutrition'), 'Freshwater Tank Filter', 'WildRoots', 'Fish', 58.00, 25, 'A quiet internal filter for freshwater aquariums up to 40 gallons.', false),
  ((select id from categories where slug = 'bedding'), 'Small Pet Hideaway Hut', 'PawMart Collection', 'Small Pet', 39.00, 35, 'A cozy hideaway hut for rabbits, guinea pigs, and other small pets.', false),
  ((select id from categories where slug = 'food-nutrition'), 'Salmon & Pumpkin Bites', 'Fresh Fields', 'Dog', 32.00, 60, 'Grain-free training treats made with salmon and pumpkin.', true),
  ((select id from categories where slug = 'grooming-kit'), 'Nail Trimmer & File Set', 'PawMart Collection', 'Cat', 28.00, 45, 'A precision nail trimmer and file set for cats.', false),
  ((select id from categories where slug = 'food-nutrition'), 'Bird Nutrition Blend', 'Fresh Fields', 'Bird', 19.00, 55, 'A balanced seed and pellet blend for everyday bird nutrition.', false),
  ((select id from categories where slug = 'toys'), 'Deluxe Chew Rope', 'WildRoots', 'Dog', 14.00, 70, 'A durable cotton chew rope for tug and solo play.', false),
  ((select id from categories where slug = 'grooming-kit'), 'Small Pet Grooming Kit', 'Nordic Home', 'Small Pet', 54.00, 20, 'A gentle grooming kit sized for small pets.', false);
