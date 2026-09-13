-- Re-add the two Small Pet products dropped in 20260828000000 (species tile
-- removal) now that product photography for them is available. Mapped onto
-- the current product-type taxonomy and the bootstrap flagship store, same
-- as the rest of the pre-pivot catalog. Images are populated separately via
-- the storage upload flow, same as every other product.

insert into products (store_id, category_id, name, brand, species, price, stock, description, is_new, slug) values
  (
    (select id from stores where slug = 'pawmart-flagship'),
    (select id from categories where slug = 'pet-supplies'),
    'Small Pet Hideaway Hut', 'PawMart Collection', 'Small Pet', 39.00, 35,
    'A cozy hideaway hut for rabbits, guinea pigs, and other small pets.', false,
    'small-pet-hideaway-hut'
  ),
  (
    (select id from stores where slug = 'pawmart-flagship'),
    (select id from categories where slug = 'pet-grooming-supplies'),
    'Small Pet Grooming Kit', 'Nordic Home', 'Small Pet', 54.00, 20,
    'A gentle grooming kit sized for small pets.', false,
    'small-pet-grooming-kit'
  );
