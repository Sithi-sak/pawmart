-- Rename the pre-pivot bootstrap store's display name. Slug stays
-- 'pawmart-flagship' since other migrations key off it.

update stores
set name = 'Bunthay Pet Supplies'
where slug = 'pawmart-flagship';
