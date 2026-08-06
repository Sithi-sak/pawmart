<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhArrowLeft, PhArrowRight, PhMagnifyingGlass, PhShoppingCart, PhPawPrint } from '@phosphor-icons/vue'
import { ElMessage } from 'element-plus'

interface Product {
  id: number
  name: string
  category: string
  brand: string
  species: string
  price: number
  isNew?: boolean
}

const species = ['Dog', 'Cat', 'Bird', 'Fish', 'Small Pet']
const categories = ['All Products', 'Food & Nutrition', 'Bedding', 'Toys', 'Grooming Kit']
const brands = ['PawMart Collection', 'Nordic Home', 'WildRoots', 'Timber & Co', 'Fresh Fields']

const priceRanges = [
  { label: '$0 — $50', min: 0, max: 50 },
  { label: '$50 — $150', min: 50, max: 150 },
  { label: '$150 — $500', min: 150, max: 500 },
  { label: '$500+', min: 500, max: Infinity },
]

const sortOptions = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A-Z' },
]

const products: Product[] = [
  { id: 1, name: 'Plush Nest Bed', category: 'Bedding', brand: 'Nordic Home', species: 'Dog', price: 345.0, isNew: true },
  { id: 2, name: 'Elevated Feeding Stand', category: 'Food & Nutrition', brand: 'Timber & Co', species: 'Dog', price: 180.0 },
  { id: 3, name: 'Woven Leather Leash Set', category: 'Toys', brand: 'WildRoots', species: 'Dog', price: 210.0 },
  { id: 4, name: 'Sisal Scratch Post', category: 'Toys', brand: 'Timber & Co', species: 'Cat', price: 540.0 },
  { id: 5, name: 'Grooming Brush Kit', category: 'Grooming Kit', brand: 'PawMart Collection', species: 'Dog', price: 125.0 },
  { id: 6, name: 'Gourmet Chicken & Wild Salmon', category: 'Food & Nutrition', brand: 'Fresh Fields', species: 'Cat', price: 45.0 },
  { id: 7, name: 'Cloud Cushion Bed', category: 'Bedding', brand: 'Nordic Home', species: 'Cat', price: 96.0 },
  { id: 8, name: 'Feather Wand Toy', category: 'Toys', brand: 'WildRoots', species: 'Cat', price: 22.0, isNew: true },
  { id: 9, name: 'Aviary Perch Set', category: 'Bedding', brand: 'Timber & Co', species: 'Bird', price: 68.0 },
  { id: 10, name: 'Freshwater Tank Filter', category: 'Food & Nutrition', brand: 'WildRoots', species: 'Fish', price: 58.0 },
  { id: 11, name: 'Small Pet Hideaway Hut', category: 'Bedding', brand: 'PawMart Collection', species: 'Small Pet', price: 39.0 },
  { id: 12, name: 'Salmon & Pumpkin Bites', category: 'Food & Nutrition', brand: 'Fresh Fields', species: 'Dog', price: 32.0, isNew: true },
  { id: 13, name: 'Nail Trimmer & File Set', category: 'Grooming Kit', brand: 'PawMart Collection', species: 'Cat', price: 28.0 },
  { id: 14, name: 'Bird Nutrition Blend', category: 'Food & Nutrition', brand: 'Fresh Fields', species: 'Bird', price: 19.0 },
  { id: 15, name: 'Deluxe Chew Rope', category: 'Toys', brand: 'WildRoots', species: 'Dog', price: 14.0 },
  { id: 16, name: 'Small Pet Grooming Kit', category: 'Grooming Kit', brand: 'Nordic Home', species: 'Small Pet', price: 54.0 },
]

const searchQuery = ref('')
const selectedSpecies = ref<string | null>(null)
const selectedCategory = ref('All Products')
const selectedPriceRanges = ref<string[]>([])
const selectedBrands = ref<string[]>([])
const sortBy = ref('newest')
const page = ref(1)
const pageSize = 6

function toggleSpecies(s: string) {
  selectedSpecies.value = selectedSpecies.value === s ? null : s
}

const filteredProducts = computed(() => {
  let result = products.slice()

  if (selectedSpecies.value) {
    result = result.filter((p) => p.species === selectedSpecies.value)
  }

  if (selectedCategory.value !== 'All Products') {
    result = result.filter((p) => p.category === selectedCategory.value)
  }

  if (selectedBrands.value.length) {
    result = result.filter((p) => selectedBrands.value.includes(p.brand))
  }

  if (selectedPriceRanges.value.length) {
    result = result.filter((p) =>
      selectedPriceRanges.value.some((label) => {
        const range = priceRanges.find((r) => r.label === label)
        return range ? p.price >= range.min && p.price < range.max : false
      }),
    )
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (p) => p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query),
    )
  }

  switch (sortBy.value) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    default:
      result.sort((a, b) => b.id - a.id)
  }

  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)))

const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredProducts.value.slice(start, start + pageSize)
})

watch([selectedSpecies, selectedCategory, selectedPriceRanges, selectedBrands, sortBy, searchQuery], () => {
  page.value = 1
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function addToCart(p: Product) {
  ElMessage.success(`Added "${p.name}" to cart`)
}
</script>

<template>
  <div class="catalog">
    <div class="catalog-header">
      <h1 class="page-title">Shop by Species</h1>
      <p class="results-count">Showing {{ filteredProducts.length }} Results</p>
    </div>

    <div class="species-row">
      <button
        v-for="s in species"
        :key="s"
        type="button"
        class="species-card"
        :class="{ 'is-active': selectedSpecies === s }"
        @click="toggleSpecies(s)"
      >
        <div class="species-icon placeholder-img">
          <PhPawPrint :size="28" />
        </div>
        <p class="species-label">{{ s }}</p>
      </button>
    </div>

    <div class="catalog-body">
      <aside class="filters">
        <div class="filter-group">
          <el-input
            v-model="searchQuery"
            placeholder="Search products or brands"
            size="large"
          >
            <template #prefix>
              <PhMagnifyingGlass :size="16" />
            </template>
          </el-input>
        </div>

        <div class="filter-group">
          <h3 class="filter-title">Categories</h3>
          <ul class="category-list">
            <li
              v-for="c in categories"
              :key="c"
              :class="{ 'is-active': selectedCategory === c }"
              @click="selectedCategory = c"
            >
              {{ c.toUpperCase() }}
            </li>
          </ul>
        </div>

        <div class="filter-group">
          <h3 class="filter-title">Price Range</h3>
          <el-checkbox-group v-model="selectedPriceRanges" class="filter-checkboxes">
            <el-checkbox v-for="r in priceRanges" :key="r.label" :label="r.label" :value="r.label">
              {{ r.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="filter-group">
          <h3 class="filter-title">Brand</h3>
          <el-checkbox-group v-model="selectedBrands" class="filter-checkboxes">
            <el-checkbox v-for="b in brands" :key="b" :label="b" :value="b">
              {{ b }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="filter-group">
          <h3 class="filter-title">Sort By</h3>
          <el-select v-model="sortBy" size="large" style="width: 100%">
            <el-option v-for="o in sortOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
      </aside>

      <div class="results">
        <div v-if="paginatedProducts.length" class="product-grid">
          <RouterLink
            v-for="p in paginatedProducts"
            :key="p.id"
            :to="`/products/${p.id}`"
            class="product-card"
          >
            <div class="product-image placeholder-img">
              <span v-if="p.isNew" class="new-badge">NEW</span>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ p.name }}</h3>
              <p class="product-category">{{ p.category.toUpperCase() }}</p>
              <div class="product-footer">
                <p class="product-price">${{ p.price.toFixed(2) }}</p>
                <button type="button" class="cart-btn" @click.prevent="addToCart(p)">
                  <PhShoppingCart :size="16" />
                </button>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else class="empty-state">
          <p>No products match your filters.</p>
        </div>

        <div class="pagination">
          <button
            type="button"
            class="page-btn"
            :disabled="page === 1"
            @click="page--"
          >
            <PhArrowLeft :size="16" />
          </button>
          <span class="page-indicator">{{ pad(page) }} / {{ pad(totalPages) }}</span>
          <button
            type="button"
            class="page-btn"
            :disabled="page === totalPages"
            @click="page++"
          >
            <PhArrowRight :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

@media (prefers-color-scheme: dark) {
  .placeholder-img {
    background: linear-gradient(180deg, #4a4a4a 0%, #2c2c2c 100%);
  }
}

.catalog {
  padding: 1rem 0 3rem;
}

.catalog-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.75rem;
}

.page-title {
  font-size: 2.5rem;
}

.results-count {
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  white-space: nowrap;
}

/* Species row */
.species-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  padding-bottom: 1.75rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid var(--color-border);
}

.species-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
}

.species-icon {
  width: 100%;
  aspect-ratio: 16 / 11;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.35);
  border: 1px solid transparent;
}

.species-card.is-active .species-icon {
  border-color: var(--color-accent);
}

.species-label {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.species-card.is-active .species-label {
  color: var(--color-accent);
}

/* Body layout */
.catalog-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2.5rem;
  align-items: start;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.filter-title {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.category-list {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.category-list li {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  opacity: 0.75;
  cursor: pointer;
}

.category-list li:hover {
  opacity: 1;
}

.category-list li.is-active {
  color: var(--color-accent);
  opacity: 1;
  font-weight: 600;
}

.filter-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Product grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.75rem;
}

.product-card {
  display: block;
  text-decoration: none;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.product-image {
  position: relative;
  aspect-ratio: 3 / 2;
}

.new-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--color-ink);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.6rem;
}

.product-info {
  padding: 1rem 1.1rem 1.1rem;
}

.product-name {
  font-size: 1.15rem;
  margin-bottom: 0.25rem;
  color: var(--color-heading);
}

.product-category {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  opacity: 0.6;
  margin-bottom: 0.75rem;
}

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.cart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  cursor: pointer;
}

.cart-btn:hover {
  background: var(--color-accent-dark);
}

.empty-state {
  padding: 3rem 0;
  text-align: center;
  opacity: 0.6;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2.5rem;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-indicator {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

@media (max-width: 900px) {
  .species-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .catalog-body {
    grid-template-columns: 1fr;
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .species-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .product-grid {
    grid-template-columns: 1fr;
  }
}
</style>
