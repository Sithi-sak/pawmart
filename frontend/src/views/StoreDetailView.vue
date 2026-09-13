<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhStorefront, PhShoppingCart, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { effectivePrice, fetchCategories, fetchProducts, type Category, type Product } from '@/lib/products'
import { fetchStoreBySlug, type Store } from '@/lib/stores'
import { useCartStore } from '@/stores/cart'
import petClothingImg from '@/assets/images/type/pet-clothing-accessories.png'
import petFoodImg from '@/assets/images/type/pet-food.png'
import petGroomingImg from '@/assets/images/type/pet-grooming-supplies.png'
import petHealthcareImg from '@/assets/images/type/pet-healthcare.png'
import petSuppliesImg from '@/assets/images/type/pet-supplies.png'
import petTrainingImg from '@/assets/images/type/pet-training-aids.png'

const typeImages: Record<string, string> = {
  'pet-clothing-accessories': petClothingImg,
  'pet-food': petFoodImg,
  'pet-grooming-supplies': petGroomingImg,
  'pet-healthcare': petHealthcareImg,
  'pet-supplies': petSuppliesImg,
  'pet-training-aids': petTrainingImg,
}

const cart = useCartStore()

const props = defineProps<{ slug?: string }>()

const store = ref<Store | null>(null)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const loadError = ref(false)
const notFound = ref(false)

const sortOptions = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A-Z' },
]

const searchQuery = ref('')
const selectedCategory = ref('All Products')
const sortBy = ref('newest')

function typeImage(name: string): string | undefined {
  return typeImages[categories.value.find((c) => c.name === name)?.slug ?? '']
}

function toggleCategory(name: string) {
  selectedCategory.value = selectedCategory.value === name ? 'All Products' : name
}

const filteredProducts = computed(() => {
  let result = products.value.slice()

  if (selectedCategory.value !== 'All Products') {
    result = result.filter((p) => p.categories?.name === selectedCategory.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter((p) => p.name.toLowerCase().includes(query))
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

async function loadStore(slug: string | undefined) {
  loading.value = true
  loadError.value = false
  notFound.value = false
  store.value = null
  products.value = []
  searchQuery.value = ''
  selectedCategory.value = 'All Products'
  sortBy.value = 'newest'

  if (!slug) {
    loading.value = false
    notFound.value = true
    return
  }

  try {
    const found = await fetchStoreBySlug(slug)
    if (!found) {
      notFound.value = true
      return
    }
    store.value = found
    const [storeProducts, categoryRows] = await Promise.all([
      fetchProducts(found.id),
      fetchCategories(),
    ])
    products.value = storeProducts
    categories.value = categoryRows
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStore(props.slug))
watch(() => props.slug, loadStore)

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
</script>

<template>
  <div class="store-detail">
    <template v-if="loading">
      <section class="store-header">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="image" class="store-logo" />
          </template>
        </el-skeleton>
        <div class="store-info">
          <el-skeleton animated style="width: 100%">
            <template #template>
              <el-skeleton-item variant="text" class="sk-eyebrow" />
              <el-skeleton-item variant="h1" class="sk-store-name" />
              <el-skeleton-item variant="text" class="sk-store-desc" />
            </template>
          </el-skeleton>
        </div>
      </section>

      <section class="products-section">
        <div class="section-header">
          <h2 class="section-title">Products</h2>
        </div>
        <div class="product-grid">
          <div v-for="n in 4" :key="n" class="product-card">
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
      </section>
    </template>

    <div v-else-if="notFound || loadError || !store" class="state-message">
      <p>{{ loadError ? "Couldn't load this store right now. Please try again shortly." : "We couldn't find that store." }}</p>
      <RouterLink to="/products" class="view-all-link">Back to Products</RouterLink>
    </div>

    <template v-else>
      <section class="store-header">
        <div class="store-logo placeholder-img" :style="store.logo_url ? { backgroundImage: `url(${store.logo_url})` } : undefined">
          <PhStorefront v-if="!store.logo_url" :size="28" />
        </div>
        <div class="store-info">
          <p class="eyebrow">STORE</p>
          <h1 class="store-name">{{ store.name }}</h1>
          <p v-if="store.description" class="store-description">{{ store.description }}</p>
        </div>
      </section>

      <section class="products-section">
        <div class="section-header">
          <h2 class="section-title">Products</h2>
          <p class="results-count">{{ filteredProducts.length }} item{{ filteredProducts.length === 1 ? '' : 's' }}</p>
        </div>

        <template v-if="products.length">
          <div class="type-row">
            <button
              v-for="c in categories"
              :key="c.id"
              type="button"
              class="type-card"
              :class="{ 'is-active': selectedCategory === c.name }"
              @click="toggleCategory(c.name)"
            >
              <div class="type-image" :style="{ backgroundImage: `url(${typeImage(c.name)})` }"></div>
              <span class="type-label">{{ c.name }}</span>
            </button>
          </div>

          <div class="store-toolbar">
            <el-input
              v-model="searchQuery"
              placeholder="Search this store's products"
              class="store-search"
            >
              <template #prefix>
                <PhMagnifyingGlass :size="16" />
              </template>
            </el-input>
            <el-select v-model="sortBy" class="store-sort">
              <el-option v-for="o in sortOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
        </template>

        <div v-if="filteredProducts.length" class="product-grid">
          <RouterLink
            v-for="p in filteredProducts"
            :key="p.id"
            :to="`/products/${p.slug}`"
            class="product-card"
          >
            <div
              class="product-image"
              :class="{ 'placeholder-img': !p.images.length }"
              :style="p.images.length ? { backgroundImage: `url(${p.images[0]})` } : undefined"
            >
              <div class="badge-stack">
                <span v-if="p.is_new" class="new-badge">NEW</span>
                <span v-if="p.is_promotional" class="tag-badge tag-badge--promo">Promo</span>
                <span v-if="p.is_discounted && p.discount_percent" class="tag-badge tag-badge--discount">
                  -{{ Math.round(p.discount_percent) }}%
                </span>
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ p.name }}</h3>
              <p class="product-category">{{ (p.categories?.name ?? '').toUpperCase() }}</p>
              <div class="product-footer">
                <div class="price-group">
                  <p class="product-price">${{ effectivePrice(p).toFixed(2) }}</p>
                  <p v-if="p.is_discounted && p.discount_percent" class="product-price-original">
                    ${{ Number(p.price).toFixed(2) }}
                  </p>
                </div>
                <button type="button" class="cart-btn" @click.prevent="addToCart(p)">
                  <PhShoppingCart :size="16" />
                </button>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else-if="products.length" class="empty-state">
          <p>No products match your search or filter.</p>
        </div>

        <div v-else class="empty-state">
          <p>This store hasn't listed any products yet.</p>
        </div>
      </section>
    </template>
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

.store-detail {
  padding: 1rem 0 3rem;
}

.state-message {
  padding: 4rem 0;
  text-align: center;
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.view-all-link {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-decoration: underline;
  color: var(--color-text);
}

/* Header */
.store-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.store-logo {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  color: rgba(0, 0, 0, 0.35);
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  margin-bottom: 0.35rem;
}

.store-name {
  font-size: 2.25rem;
  line-height: 1.15;
  margin-bottom: 0.5rem;
}

.store-description {
  color: var(--color-text);
  opacity: 0.8;
  max-width: 560px;
}

/* Products */
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
}

.results-count {
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
}

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

.store-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}

.store-search {
  max-width: 280px;
  width: 100%;
}

.store-sort {
  width: 200px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
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
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
}

.badge-stack {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.new-badge,
.tag-badge {
  background: var(--color-ink);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.6rem;
}

.tag-badge--promo {
  background: #2b6cb0;
}

.tag-badge--discount {
  background: #c0392b;
}

.product-info {
  padding: 1rem 1.1rem 1.1rem;
}

.product-name {
  font-size: 1.05rem;
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

.price-group {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.product-price {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.product-price-original {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.5;
  text-decoration: line-through;
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

.sk-eyebrow {
  width: 60px;
  margin-bottom: 0.35rem;
}

.sk-store-name {
  width: 45%;
  margin-bottom: 0.5rem;
}

.sk-store-desc {
  width: 70%;
}

.sk-name {
  width: 70%;
  margin-bottom: 0.25rem;
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

@media (max-width: 900px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .store-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .store-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .store-search {
    max-width: none;
  }

  .store-sort {
    width: 100%;
  }

  .product-grid {
    grid-template-columns: 1fr;
  }
}
</style>
