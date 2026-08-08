<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhCaretDown, PhTruck, PhShieldCheck } from '@phosphor-icons/vue'
import { ElMessage } from 'element-plus'
import { fetchProductBySlug, fetchRelatedProducts, type Product } from '@/lib/products'

const props = defineProps<{ slug?: string }>()

const product = ref<Product | null>(null)
const relatedProducts = ref<Product[]>([])
const loading = ref(true)
const loadError = ref(false)
const quantity = ref(1)

async function loadProduct(slug: string | undefined) {
  loading.value = true
  loadError.value = false
  product.value = null
  relatedProducts.value = []
  quantity.value = 1

  if (!slug) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    const found = await fetchProductBySlug(slug)
    product.value = found
    if (found) {
      relatedProducts.value = await fetchRelatedProducts(found.category_id, found.id)
    }
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => loadProduct(props.slug))
watch(() => props.slug, loadProduct)

const openPanel = ref<'description' | 'shipping' | null>('description')

function togglePanel(panel: 'description' | 'shipping') {
  openPanel.value = openPanel.value === panel ? null : panel
}

function onPanelEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = '0px'
  void element.offsetHeight
  element.style.height = `${element.scrollHeight}px`
}

function onPanelAfterEnter(el: Element) {
  ;(el as HTMLElement).style.height = 'auto'
}

function onPanelLeave(el: Element) {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  void element.offsetHeight
  element.style.height = '0px'
}

function formatPrice(value: number) {
  return `$${Number(value).toFixed(2)}`
}

function incrementQuantity() {
  if (product.value && quantity.value < product.value.stock) quantity.value++
}

function decrementQuantity() {
  if (quantity.value > 1) quantity.value--
}

function addToCart() {
  if (!product.value) return
  ElMessage.success(`Added ${quantity.value} × "${product.value.name}" to cart`)
}

function addToWishlist() {
  if (!product.value) return
  ElMessage.success(`Added "${product.value.name}" to wishlist`)
}
</script>

<template>
  <div class="product-detail">
    <div v-if="loading" class="state-message">Loading product…</div>

    <div v-else-if="loadError || !product" class="state-message">
      <p>We couldn't find that product.</p>
      <RouterLink to="/products" class="view-all-link">Back to Products</RouterLink>
    </div>

    <template v-else>
      <div class="detail-top">
        <div class="gallery">
          <div
            v-for="(src, i) in product.images.length ? product.images.slice(0, 4) : [null, null, null, null]"
            :key="i"
            class="gallery-image"
            :class="{ 'placeholder-img': !src }"
            :style="src ? { backgroundImage: `url(${src})` } : undefined"
          ></div>
        </div>

        <div class="info">
          <p class="eyebrow">{{ (product.categories?.name ?? product.species ?? '').toUpperCase() }}</p>
          <h1 class="product-name">{{ product.name }}</h1>
          <p class="price">{{ formatPrice(product.price) }}</p>

          <div class="divider"></div>

          <p class="stock-status" :class="{ 'is-out': product.stock <= 0 }">
            {{ product.stock > 0 ? `${product.stock} in stock` : 'Out of stock' }}
          </p>

          <div class="option-group">
            <p class="option-label">QUANTITY</p>
            <div class="quantity-stepper">
              <button type="button" class="qty-btn" :disabled="quantity <= 1" @click="decrementQuantity">
                −
              </button>
              <span class="qty-value">{{ quantity }}</span>
              <button
                type="button"
                class="qty-btn"
                :disabled="quantity >= product.stock"
                @click="incrementQuantity"
              >
                +
              </button>
            </div>
          </div>

          <button type="button" class="add-to-cart-btn" :disabled="product.stock <= 0" @click="addToCart">
            {{ product.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK' }}
          </button>
          <button type="button" class="wishlist-btn" @click="addToWishlist">WISHLIST</button>

          <ul class="perks">
            <li>
              <PhTruck :size="18" />
              <span>Complimentary Express Shipping</span>
            </li>
            <li>
              <PhShieldCheck :size="18" />
              <span>Quality Checked Before Shipping</span>
            </li>
          </ul>
        </div>
      </div>

      <section class="details-care">
        <div class="accordion-col">
          <h2 class="section-title">Details &amp; Care</h2>

          <div class="accordion-item">
            <button type="button" class="accordion-header" @click="togglePanel('description')">
              <span>DESCRIPTION</span>
              <PhCaretDown :size="16" class="accordion-caret" :class="{ 'is-open': openPanel === 'description' }" />
            </button>
            <Transition @enter="onPanelEnter" @after-enter="onPanelAfterEnter" @leave="onPanelLeave">
              <div v-if="openPanel === 'description'" class="accordion-content">
                <p class="accordion-body">{{ product.description || 'No description available yet.' }}</p>
              </div>
            </Transition>
          </div>

          <div class="accordion-item">
            <button type="button" class="accordion-header" @click="togglePanel('shipping')">
              <span>SHIPPING &amp; RETURNS</span>
              <PhCaretDown :size="16" class="accordion-caret" :class="{ 'is-open': openPanel === 'shipping' }" />
            </button>
            <Transition @enter="onPanelEnter" @after-enter="onPanelAfterEnter" @leave="onPanelLeave">
              <div v-if="openPanel === 'shipping'" class="accordion-content">
                <p class="accordion-body">
                  Complimentary express shipping on all orders within Cambodia, arriving in 2–4
                  business days. Returns are accepted within 30 days of delivery for unused items
                  in their original packaging.
                </p>
              </div>
            </Transition>
          </div>
        </div>

        <div class="details-image placeholder-img"></div>
      </section>

      <section v-if="relatedProducts.length" class="related">
        <div class="related-header">
          <div>
            <p class="eyebrow">YOU MAY ALSO LIKE</p>
            <h2 class="section-title">Related Products</h2>
          </div>
          <RouterLink to="/products" class="view-all-link">VIEW ALL</RouterLink>
        </div>

        <div class="related-grid">
          <RouterLink
            v-for="p in relatedProducts"
            :key="p.id"
            :to="`/products/${p.slug}`"
            class="related-card"
          >
            <div
              class="related-image"
              :class="{ 'placeholder-img': !p.images.length }"
              :style="p.images.length ? { backgroundImage: `url(${p.images[0]})` } : undefined"
            ></div>
            <div class="related-info">
              <p class="related-category">{{ (p.categories?.name ?? '').toUpperCase() }}</p>
              <h3 class="related-name">{{ p.name }}</h3>
              <p class="related-price">{{ formatPrice(p.price) }}</p>
            </div>
          </RouterLink>
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

.product-detail {
  padding: 1rem 0 3rem;
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 1.85rem;
}

/* Top section */
.detail-top {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  margin-bottom: 4rem;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  align-content: start;
}

.gallery-image {
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
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

.info {
  max-width: 420px;
}

.product-name {
  font-size: 2.75rem;
  line-height: 1.1;
  margin-bottom: 0.75rem;
}

.price {
  font-size: 1.1rem;
  color: var(--color-heading);
  margin-bottom: 1.25rem;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 1.5rem;
}

.option-group {
  margin-bottom: 1.5rem;
}

.option-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.option-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

.stock-status {
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: var(--color-accent);
  margin-bottom: 1.25rem;
}

.stock-status.is-out {
  color: var(--color-text);
  opacity: 0.6;
}

.quantity-stepper {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: fit-content;
  border: 1px solid var(--color-border);
}

.qty-btn {
  width: 2.5rem;
  height: 2.5rem;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1.1rem;
  cursor: pointer;
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty-btn:not(:disabled):hover {
  color: var(--color-accent);
}

.qty-value {
  min-width: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.add-to-cart-btn {
  display: block;
  width: 100%;
  height: 3rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.add-to-cart-btn:hover {
  background: var(--color-accent-dark);
}

.add-to-cart-btn:disabled {
  background: var(--color-border);
  cursor: not-allowed;
}

.wishlist-btn {
  display: block;
  width: 100%;
  height: 3rem;
  background: var(--color-background);
  border: 1px solid var(--color-heading);
  color: var(--color-heading);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.75rem;
}

.wishlist-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.perks {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.perks li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
}

/* Details & Care */
.details-care {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-bottom: 4rem;
}

.section-title {
  margin-bottom: 1.5rem;
}

.accordion-item {
  border-bottom: 1px solid var(--color-border);
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 1rem 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--color-heading);
  font-family: inherit;
  cursor: pointer;
}

.accordion-caret {
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.accordion-caret.is-open {
  transform: rotate(180deg);
}

.accordion-content {
  overflow: hidden;
  transition: height 0.25s ease;
}

.accordion-body {
  padding-bottom: 1.25rem;
  color: var(--color-text);
  opacity: 0.85;
}

.details-image {
  aspect-ratio: 4 / 3;
}

/* Related */
.related-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.related-header .section-title {
  margin-bottom: 0;
}

.view-all-link {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-decoration: underline;
  color: var(--color-text);
  white-space: nowrap;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.related-card {
  display: block;
  text-decoration: none;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.related-image {
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
}

.related-info {
  padding: 0.9rem 1rem 1.1rem;
}

.related-category {
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  opacity: 0.6;
  margin-bottom: 0.35rem;
}

.related-name {
  font-size: 1rem;
  margin-bottom: 0.35rem;
  color: var(--color-heading);
}

.related-price {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

@media (max-width: 900px) {
  .detail-top,
  .details-care {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .info {
    max-width: none;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .gallery {
    grid-template-columns: 1fr;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}

</style>
