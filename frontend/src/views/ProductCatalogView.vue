<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhArrowLeft, PhArrowRight, PhMagnifyingGlass, PhShoppingCart } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchCategories, fetchProducts, type Category, type Product } from '@/lib/products'
import { useCartStore } from '@/stores/cart'
import dogImg from '@/assets/images/dog.jpg'
import catImg from '@/assets/images/cat.jpg'
import birdImg from '@/assets/images/bird.jpg'
import fishImg from '@/assets/images/fish.jpg'
import petClothingImg from '@/assets/images/type/pet-clothing-accessories.png'
import petFoodImg from '@/assets/images/type/pet-food.png'
import petGroomingImg from '@/assets/images/type/pet-grooming-supplies.png'
import petHealthcareImg from '@/assets/images/type/pet-healthcare.png'
import petSuppliesImg from '@/assets/images/type/pet-supplies.png'
import petTrainingImg from '@/assets/images/type/pet-training-aids.png'

const cart = useCartStore()
const router = useRouter()

const species = ['Dog', 'Cat', 'Bird', 'Fish']

const speciesImages: Record<string, string> = {
  Dog: dogImg,
  Cat: catImg,
  Bird: birdImg,
  Fish: fishImg,
}

const typeImages: Record<string, string> = {
  'pet-clothing-accessories': petClothingImg,
  'pet-food': petFoodImg,
  'pet-grooming-supplies': petGroomingImg,
  'pet-healthcare': petHealthcareImg,
  'pet-supplies': petSuppliesImg,
  'pet-training-aids': petTrainingImg,
}

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

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const categoryNames = computed(() => categories.value.map((c) => c.name))
const loading = ref(true)
const loadError = ref(false)

function typeImage(name: string): string | undefined {
  return typeImages[categories.value.find((c) => c.name === name)?.slug ?? '']
}

const storeNames = computed(() =>
  Array.from(
    new Set(products.value.map((p) => p.stores?.name).filter((s): s is string => !!s)),
  ).sort(),
)

const categoryOptions = computed(() => ['All Products', ...categoryNames.value])

async function loadCatalog() {
  loading.value = true
  loadError.value = false
  try {
    const [productRows, categoryRows] = await Promise.all([fetchProducts(), fetchCategories()])
    products.value = productRows
    categories.value = categoryRows
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadCatalog)

const searchQuery = ref('')
const selectedSpecies = ref<string | null>(null)
const selectedCategory = ref('All Products')
const selectedPriceRanges = ref<string[]>([])
const selectedStores = ref<string[]>([])
const sortBy = ref('newest')
const page = ref(1)
const pageSize = 6

function toggleSpecies(s: string) {
  selectedSpecies.value = selectedSpecies.value === s ? null : s
}

function toggleCategory(c: string) {
  selectedCategory.value = selectedCategory.value === c ? 'All Products' : c
}

const filteredProducts = computed(() => {
  let result = products.value.slice()

  if (selectedSpecies.value) {
    result = result.filter((p) => p.species === selectedSpecies.value)
  }

  if (selectedCategory.value !== 'All Products') {
    result = result.filter((p) => p.categories?.name === selectedCategory.value)
  }

  if (selectedStores.value.length) {
    result = result.filter((p) => p.stores?.name && selectedStores.value.includes(p.stores.name))
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
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.stores?.name.toLowerCase().includes(query) ?? false),
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

watch([selectedSpecies, selectedCategory, selectedPriceRanges, selectedStores, sortBy, searchQuery], () => {
  page.value = 1
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

async function addToCart(p: Product) {
  if (cart.conflictsWithCart(p)) {
    try {
      await ElMessageBox.confirm(
        `Your cart has items from ${cart.activeStoreName ?? 'another store'}. Clear it to add items from a different store?`,
        'Different Store',
        { confirmButtonText: 'Clear Cart & Add', cancelButtonText: 'Cancel', type: 'warning' },
      )
    } catch {
      return
    }
    cart.clear()
  }

  cart.addItem(p)
  ElMessage.success(`Added "${p.name}" to cart`)
}

function goToStore(p: Product) {
  if (p.stores) router.push(`/store/${p.stores.slug}`)
}
</script>

<template>
  <div class="catalog">
    <div class="catalog-header">
      <h1 class="page-title">Shop by Species</h1>
      <p class="results-count">Showing {{ filteredProducts.length }} Results</p>
    </div>

    <div class="type-row">
      <button
        v-for="c in categoryNames"
        :key="c"
        type="button"
        class="type-card"
        :class="{ 'is-active': selectedCategory === c }"
        @click="toggleCategory(c)"
      >
        <div class="type-image" :style="{ backgroundImage: `url(${typeImage(c)})` }"></div>
        <span class="type-label">{{ c }}</span>
      </button>
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
        <div class="species-icon" :style="{ backgroundImage: `url(${speciesImages[s]})` }"></div>
        <p class="species-label">{{ s }}</p>
      </button>
    </div>

    <div class="catalog-body">
      <aside class="filters">
        <div class="filter-group">
          <el-input
            v-model="searchQuery"
            placeholder="Search products or stores"
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
              v-for="c in categoryOptions"
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
          <h3 class="filter-title">Store</h3>
          <el-checkbox-group v-model="selectedStores" class="filter-checkboxes">
            <el-checkbox v-for="s in storeNames" :key="s" :label="s" :value="s">
              {{ s }}
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
        <div v-if="loading" class="product-grid">
          <div v-for="n in pageSize" :key="n" class="product-card">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="image" class="product-image" />
                <div class="product-info">
                  <el-skeleton-item variant="h3" class="sk-name" />
                  <el-skeleton-item variant="text" class="sk-category" />
                  <div class="product-footer">
                    <el-skeleton-item variant="text" class="sk-price" />
                    <el-skeleton-item variant="circle" class="sk-cart-btn" />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>

        <div v-else-if="loadError" class="empty-state">
          <p>Couldn't load products right now. Please try again shortly.</p>
        </div>

        <div v-else-if="paginatedProducts.length" class="product-grid">
          <RouterLink
            v-for="p in paginatedProducts"
            :key="p.id"
            :to="`/products/${p.slug}`"
            class="product-card"
          >
            <div
              class="product-image"
              :class="{ 'placeholder-img': !p.images.length }"
              :style="p.images.length ? { backgroundImage: `url(${p.images[0]})` } : undefined"
            >
              <span v-if="p.is_new" class="new-badge">NEW</span>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ p.name }}</h3>
              <p class="product-category">{{ (p.categories?.name ?? '').toUpperCase() }}</p>
              <button
                v-if="p.stores"
                type="button"
                class="sold-by-link"
                @click.stop.prevent="goToStore(p)"
              >
                Sold by {{ p.stores.name }}
              </button>
              <div class="product-footer">
                <p class="product-price">${{ Number(p.price).toFixed(2) }}</p>
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

/* Product-type row */
.type-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
}

.type-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: #fff;
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: center;
  border: 1px solid transparent;
  transition: border-color 0.15s ease;
}

.type-card:hover .type-image {
  border-color: var(--color-accent);
}

.type-card.is-active .type-image {
  border-color: var(--color-accent);
}

.type-label {
  font-size: 0.75rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  min-height: 2.6em;
}

.type-card:hover .type-label {
  color: var(--color-accent);
}

.type-card.is-active .type-label {
  color: var(--color-accent);
}

/* Species row */
.species-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  aspect-ratio: 4 / 2;
  background-size: 100%;
  background-position: center;
}

.species-card.is-active .species-icon {
  border: 1px solid transparent;
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
  height: auto;
  background-size: cover;
  background-position: center;
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
  margin-bottom: 0.35rem;
}

.sold-by-link {
  display: block;
  background: none;
  border: none;
  padding: 0;
  margin-bottom: 0.75rem;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
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

.sk-name {
  width: 70%;
  margin-bottom: 0.5rem;
}

.sk-category {
  width: 40%;
  margin-bottom: 0.75rem;
}

.sk-price {
  width: 35%;
}

.sk-cart-btn {
  width: 2.25rem;
  height: 2.25rem;
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
