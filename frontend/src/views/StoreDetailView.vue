<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhStorefront, PhShoppingCart } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchProducts, type Product } from '@/lib/products'
import { fetchStoreBySlug, type Store } from '@/lib/stores'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()

const props = defineProps<{ slug?: string }>()

const store = ref<Store | null>(null)
const products = ref<Product[]>([])
const loading = ref(true)
const loadError = ref(false)
const notFound = ref(false)

async function loadStore(slug: string | undefined) {
  loading.value = true
  loadError.value = false
  notFound.value = false
  store.value = null
  products.value = []

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
    products.value = await fetchProducts(found.id)
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
    <div v-if="loading" class="state-message">Loading store…</div>

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
          <p class="results-count">{{ products.length }} item{{ products.length === 1 ? '' : 's' }}</p>
        </div>

        <div v-if="products.length" class="product-grid">
          <RouterLink
            v-for="p in products"
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

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

  .product-grid {
    grid-template-columns: 1fr;
  }
}
</style>
