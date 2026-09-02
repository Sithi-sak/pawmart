-- Seed 6 Cambodia-flavored demo stores with real catalog depth, so the
-- marketplace pivot (Phase 3.10) has something to actually demonstrate
-- instead of one generic flagship store.
--
-- Ordering dependency: run backend/scripts/seed_demo_stores.py FIRST so
-- these 6 `stores` rows exist (a migration can't create the backing
-- auth.users rows itself -- same reasoning as the pawmart-flagship
-- bootstrap, see CHECKPOINT.md task 3.10.2). This migration only sets
-- each store's description (provision_store_owner doesn't set one) and
-- seeds products against the existing 6-category / 4-species taxonomy
-- from 20260828000000_recategorize_products.sql. `slug` (required,
-- unique -- 20260808010000_add_product_slug.sql) is set explicitly per
-- row alongside `name`, same as that migration backfilled it for the
-- original 16 products.
--
-- Each store specializes in 1-2 categories/species rather than carrying
-- everything, and each product's brand signals local vs. imported origin
-- (invented brand names throughout -- no real trademarks): local brands
-- lean on Cambodian places/materials (Krama Threads, Tonle Harvest,
-- Sangkae Farms, Kampot Bites, Bassac Botanicals, Bokor Naturals, Mekong
-- Made, Angkor Roots, Silk Island Weaves), imported ones read as
-- generic Western/regional pet brands (Wilderness Trail, Cascade
-- Naturals, Golden State Pet Co., EuroVet Labs, Siam Aqua, Pacific Aqua
-- Co.), reusing Fresh Fields/WildRoots from the original flagship seed
-- for continuity. Images are intentionally left empty (`{}`) -- image
-- sourcing is a separate, later pass.

update stores set description = 'Aquarium and aviary specialists on the Chroy Changvar riverside -- tanks, cages, and feed for fish and birds.' where slug = 'mekong-aqua-aviary';
update stores set description = 'Boutique grooming and accessories for Phnom Penh''s BKK1 pet-parents -- krama-inspired collars, coats, and spa-grade grooming kits.' where slug = 'bkk1-pet-boutique';
update stores set description = 'A neighbourhood pantry in Toul Kork stocking everyday food for dogs, cats, birds, and fish -- local harvests alongside imported staples.' where slug = 'toul-kork-paw-pantry';
update stores set description = 'Health and training supplies near the Bassac riverfront, run by a former vet clinic assistant.' where slug = 'bassac-vet-supply';
update stores set description = 'Bulk crates, litter, tanks, and cages for Sen Sok''s growing pet-owning households.' where slug = 'sen-sok-pet-barn';
update stores set description = 'Siem Reap boutique importing travel gear and enrichment toys for dogs and cats, run out of the Old Market area.' where slug = 'angkor-paws';

-- 1. Mekong Aqua & Aviary -- fish + bird specialist (supplies, food, healthcare)
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-supplies'), 'Riverside 40L Aquarium Filter Kit', 'riverside-40l-aquarium-filter-kit', 'Siam Aqua', 'Fish', 45.00, 18, 'Imported from Thailand, a quiet internal filter sized for a 40-litre freshwater setup.', true),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-food'), 'Tonle Flake Fish Food', 'tonle-flake-fish-food', 'Tonle Harvest', 'Fish', 6.00, 60, 'Flaked fish food milled locally from Tonle Sap freshwater fish stock.', false),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-healthcare'), 'Water Conditioner Drops', 'water-conditioner-drops', 'Pacific Aqua Co.', 'Fish', 9.00, 40, 'Imported from the USA, dechlorinates tap water instantly and eases fish into a new tank.', false),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-supplies'), 'Bamboo Aviary Cage, Medium', 'bamboo-aviary-cage-medium', 'Mekong Made', 'Bird', 58.00, 10, 'Hand-built from Kandal province bamboo, sized for a pair of small to medium birds.', false),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-food'), 'Sangkae Rice & Seed Blend', 'sangkae-rice-seed-blend', 'Sangkae Farms', 'Bird', 7.00, 45, 'A balanced seed and rice-husk blend grown along the Sangkae river in Battambang.', true),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-healthcare'), 'Calcium Perch Block', 'calcium-perch-block', 'Golden State Pet Co.', 'Bird', 5.00, 50, 'Imported from the USA, a mineral block that doubles as a beak-conditioning perch.', false),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-supplies'), 'Glass Betta Bowl with LED', 'glass-betta-bowl-with-led', 'Siam Aqua', 'Fish', 18.00, 25, 'Imported from Thailand, a compact glass bowl with a clip-on LED for single-betta setups.', false),
  ((select id from stores where slug = 'mekong-aqua-aviary'), (select id from categories where slug = 'pet-supplies'), 'Rattan Bird Swing & Perch Set', 'rattan-bird-swing-perch-set', 'Mekong Made', 'Bird', 12.00, 30, 'Woven rattan swing and perch set, handmade by riverside craftspeople near Chroy Changvar.', false);

-- 2. BKK1 Pet Boutique -- dog + cat clothing/accessories and grooming
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-clothing-accessories'), 'Krama Print Bandana', 'krama-print-bandana', 'Krama Threads', 'Dog', 8.00, 40, 'A dog bandana cut from traditional Cambodian krama cotton in the classic checkered weave.', true),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-clothing-accessories'), 'Silk Island Woven Collar', 'silk-island-woven-collar', 'Silk Island Weaves', 'Cat', 10.00, 35, 'Woven on Koh Dach (Silk Island) looms just outside Phnom Penh, a lightweight adjustable collar.', false),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-clothing-accessories'), 'Reflective Rain Jacket', 'reflective-rain-jacket', 'Cascade Naturals', 'Dog', 22.00, 20, 'Imported from the USA, a waterproof rain jacket with reflective piping for evening walks.', false),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-grooming-supplies'), 'Bamboo Detangling Brush', 'bamboo-detangling-brush', 'Bassac Botanicals', 'Cat', 9.00, 30, 'A bamboo-handled slicker brush made locally, gentle enough for daily detangling.', false),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-grooming-supplies'), 'Coconut Oatmeal Shampoo', 'coconut-oatmeal-shampoo', 'Bassac Botanicals', 'Dog', 11.00, 28, 'Locally formulated with Cambodian coconut oil and oatmeal for sensitive skin.', true),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-clothing-accessories'), 'Adjustable Leather Harness', 'adjustable-leather-harness', 'Krama Threads', 'Dog', 19.00, 22, 'Locally tanned leather harness with a krama-woven chest panel, adjustable across four points.', false),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-grooming-supplies'), 'Self-Cleaning Slicker Brush', 'self-cleaning-slicker-brush', 'Cascade Naturals', 'Cat', 13.00, 26, 'Imported from the USA, a retractable-bristle brush that ejects loose fur with one button.', false),
  ((select id from stores where slug = 'bkk1-pet-boutique'), (select id from categories where slug = 'pet-clothing-accessories'), 'Woven Krama Cat Bed Wrap', 'woven-krama-cat-bed-wrap', 'Krama Threads', 'Cat', 15.00, 18, 'A soft krama-cotton wrap that turns any cushion into a familiar-smelling cat bed.', false);

-- 3. Toul Kork Paw Pantry -- food specialist across all 4 species
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Grain-Free Chicken Kibble 3kg', 'grain-free-chicken-kibble-3kg', 'Wilderness Trail', 'Dog', 28.00, 30, 'Imported from the USA, a grain-free kibble built around real chicken as the first ingredient.', true),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Ocean Fish Pate Wet Food', 'ocean-fish-pate-wet-food', 'Fresh Fields', 'Cat', 2.50, 80, 'Imported wet food made with real ocean fish in a smooth pate texture.', false),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Kampot Pepper Beef Jerky Treats', 'kampot-pepper-beef-jerky-treats', 'Kampot Bites', 'Dog', 6.00, 45, 'Slow-dried beef jerky treats seasoned with a light touch of real Kampot pepper.', true),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Sangkae Rice & Fish Kibble', 'sangkae-rice-fish-kibble', 'Sangkae Farms', 'Cat', 14.00, 35, 'Locally milled kibble combining Battambang rice with freshwater fish meal.', false),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Tropical Fruit & Seed Mix', 'tropical-fruit-seed-mix', 'Tonle Harvest', 'Bird', 8.00, 40, 'A locally blended mix of dried tropical fruit and seed for everyday bird nutrition.', false),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Freeze-Dried Bloodworms', 'freeze-dried-bloodworms', 'Siam Aqua', 'Fish', 7.00, 50, 'Imported from Thailand, freeze-dried bloodworms as a high-protein treat for freshwater fish.', false),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Sweet Potato Training Treats', 'sweet-potato-training-treats', 'Kampot Bites', 'Dog', 5.00, 55, 'Single-ingredient dried sweet potato chews, made locally without additives.', false),
  ((select id from stores where slug = 'toul-kork-paw-pantry'), (select id from categories where slug = 'pet-food'), 'Grain-Free Salmon Kibble', 'grain-free-salmon-kibble', 'Wilderness Trail', 'Cat', 26.00, 28, 'Imported from the USA, a grain-free salmon kibble for cats with sensitive stomachs.', false);

-- 4. Bassac Vet Supply -- dog + cat healthcare and training
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-healthcare'), 'Flea & Tick Spot Treatment', 'flea-tick-spot-treatment', 'EuroVet Labs', 'Dog', 16.00, 30, 'Imported from Europe, a monthly spot-on treatment for flea and tick prevention.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-healthcare'), 'Hairball Control Supplement', 'hairball-control-supplement', 'Bassac Botanicals', 'Cat', 10.00, 25, 'A locally formulated fiber supplement that helps hairballs pass naturally.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-training-aids'), 'Clicker Training Kit', 'clicker-training-kit', 'Golden State Pet Co.', 'Dog', 7.00, 40, 'Imported from the USA, a two-clicker starter kit with a basic positive-reinforcement guide.', true),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-training-aids'), 'Catnip Training Spray', 'catnip-training-spray', 'Bokor Naturals', 'Cat', 6.00, 35, 'Locally grown catnip extract, sprayed onto scratch posts or beds to redirect behavior.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-healthcare'), 'Joint Support Chews', 'joint-support-chews', 'EuroVet Labs', 'Dog', 18.00, 20, 'Imported from Europe, glucosamine chews for aging or active joints.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-training-aids'), 'Long-Line Training Leash 10m', 'long-line-training-leash-10m', 'Krama Threads', 'Dog', 12.00, 24, 'A locally made 10-metre cotton training leash for recall practice in open spaces.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-healthcare'), 'Herbal Calming Drops', 'herbal-calming-drops', 'Bokor Naturals', 'Cat', 9.00, 28, 'A locally blended herbal tincture to ease travel or vet-visit anxiety.', false),
  ((select id from stores where slug = 'bassac-vet-supply'), (select id from categories where slug = 'pet-training-aids'), 'Puzzle Feeder Training Mat', 'puzzle-feeder-training-mat', 'Golden State Pet Co.', 'Cat', 14.00, 22, 'Imported from the USA, a slow-feeding puzzle mat that turns mealtime into enrichment.', false);

-- 5. Sen Sok Pet Barn -- bulk supplies across all 4 species
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Foldable Wire Crate, Large', 'foldable-wire-crate-large', 'Cascade Naturals', 'Dog', 65.00, 15, 'Imported from the USA, a fold-flat wire crate with a removable tray for easy cleaning.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Covered Litter Box', 'covered-litter-box', 'Mekong Made', 'Cat', 17.00, 30, 'A locally molded covered litter box with a swinging door and carbon-filter lid.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Stainless Steel Cage, Large', 'stainless-steel-cage-large', 'Golden State Pet Co.', 'Bird', 72.00, 10, 'Imported from the USA, a rust-resistant stainless steel cage built for humid climates.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), '20-Gallon Starter Tank Set', '20-gallon-starter-tank-set', 'Siam Aqua', 'Fish', 89.00, 8, 'Imported from Thailand, a complete starter tank with filter, hood, and light.', true),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Woven Rattan Dog Bed', 'woven-rattan-dog-bed', 'Mekong Made', 'Dog', 34.00, 16, 'A locally woven rattan-frame bed with a removable washable cushion.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Sisal Scratching Post', 'sisal-scratching-post', 'Angkor Roots', 'Cat', 24.00, 20, 'A tall sisal-wrapped scratching post on a stable locally made base.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Travel Carrier Cage', 'travel-carrier-cage', 'Mekong Made', 'Bird', 15.00, 25, 'A lightweight locally made travel cage sized for a single small bird.', false),
  ((select id from stores where slug = 'sen-sok-pet-barn'), (select id from categories where slug = 'pet-supplies'), 'Aquarium Gravel & Decor Set', 'aquarium-gravel-decor-set', 'Angkor Roots', 'Fish', 11.00, 35, 'Locally sourced river gravel with two ceramic hideaway ornaments.', false);

-- 6. Angkor Paws -- Siem Reap boutique, imported-leaning clothing + training
insert into products (store_id, category_id, name, slug, brand, species, price, stock, description, is_new) values
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-clothing-accessories'), 'Travel Backpack Carrier', 'travel-backpack-carrier', 'Cascade Naturals', 'Dog', 38.00, 12, 'Imported from the USA, a ventilated backpack carrier for small dogs on temple-hopping days.', true),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-clothing-accessories'), 'Adjustable Cat Vest Harness', 'adjustable-cat-vest-harness', 'Golden State Pet Co.', 'Cat', 16.00, 18, 'Imported from the USA, an escape-resistant vest harness for walking cats outdoors.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-training-aids'), 'Interactive Treat Puzzle Ball', 'interactive-treat-puzzle-ball', 'Cascade Naturals', 'Dog', 9.00, 30, 'Imported from the USA, a rolling treat-dispensing ball for solo enrichment.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-training-aids'), 'Feather Wand & Laser Combo', 'feather-wand-laser-combo', 'Angkor Roots', 'Cat', 7.00, 40, 'A locally made feather wand with a built-in laser pointer for interactive play.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-clothing-accessories'), 'Angkor Stone-Print Bandana', 'angkor-stone-print-bandana', 'Angkor Roots', 'Dog', 8.00, 35, 'A locally printed bandana featuring a bas-relief pattern inspired by Angkor stonework.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-training-aids'), 'Retractable Leash 5m', 'retractable-leash-5m', 'Golden State Pet Co.', 'Dog', 13.00, 26, 'Imported from the USA, a 5-metre retractable leash with a one-button brake and lock.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-clothing-accessories'), 'Woven Reed Cat Carrier Basket', 'woven-reed-cat-carrier-basket', 'Silk Island Weaves', 'Cat', 28.00, 10, 'A hand-woven reed carrier basket in the Koh Dach weaving tradition, lined with cotton.', false),
  ((select id from stores where slug = 'angkor-paws'), (select id from categories where slug = 'pet-training-aids'), 'Agility Tunnel Toy', 'agility-tunnel-toy', 'Cascade Naturals', 'Cat', 21.00, 15, 'Imported from the USA, a collapsible tunnel toy for indoor agility and hide-and-seek play.', false);
