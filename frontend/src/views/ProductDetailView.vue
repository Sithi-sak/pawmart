<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhCaretDown, PhTruck, PhShieldCheck } from '@phosphor-icons/vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ id?: string }>()

interface ColorOption {
  name: string
  hex: string
}

interface RelatedProduct {
  id: number
  category: string
  name: string
  price: number
}

interface CatalogEntry {
  id: number
  category: string
  name: string
  price: number
}

// Subset of ProductCatalogView's mock catalog, kept in sync by id so links
// into this page (from /products and from "Related Essentials") show the
// product that was actually clicked.
const catalog: CatalogEntry[] = [
  { id: 3, category: 'Handcrafted Leather', name: 'Woven Leather Leash Set', price: 210.0 },
  { id: 1, category: 'Bedding', name: 'Plush Nest Bed', price: 345.0 },
  { id: 5, category: 'Grooming Kit', name: 'Grooming Brush Kit', price: 125.0 },
  { id: 6, category: 'Food & Nutrition', name: 'Gourmet Chicken & Wild Salmon', price: 45.0 },
  { id: 13, category: 'Grooming Kit', name: 'Nail Trimmer & File Set', price: 28.0 },
]

const defaultEntry = catalog[0]!

const product = computed(() => {
  const entry = catalog.find((p) => p.id === Number(props.id)) ?? defaultEntry
  return {
    ...entry,
    colors: [
      { name: 'Cognac', hex: '#8a5a34' },
      { name: 'Black', hex: '#1a1a1a' },
      { name: 'Tan', hex: '#d8bd93' },
    ] as ColorOption[],
    sizes: ['XS', 'S', 'M', 'L'],
    craftsmanship:
      'Cut from full-grain vegetable-tanned leather and hand-stitched by our saddlery partners, this piece is finished with solid brass hardware that ages into a warm patina over time. Each item can be engraved with your pet\'s name on request.',
    care: 'Wipe clean with a soft, dry cloth after each use. Apply a leather conditioner every 2–3 months to keep the hide supple, and avoid prolonged exposure to water or direct sunlight.',
    shipping:
      'Complimentary express shipping on all orders within Cambodia, arriving in 2–4 business days. Returns are accepted within 30 days of delivery for unused items in their original packaging.',
  }
})

const selectedColor = ref(product.value.colors[0]!.name)
const selectedSize = ref('S')

watch(product, (p) => {
  selectedColor.value = p.colors[0]!.name
  selectedSize.value = 'S'
})

const relatedProducts: RelatedProduct[] = [
  { id: 5, category: 'Accessories', name: 'Grooming Brush Kit', price: 125.0 },
  { id: 6, category: 'Dining', name: 'Gourmet Chicken & Wild Salmon', price: 45.0 },
  { id: 13, category: 'Hardware', name: 'Nail Trimmer & File Set', price: 28.0 },
  { id: 3, category: 'Travel', name: 'Woven Leather Leash Set', price: 210.0 },
]

const openPanel = ref<'craftsmanship' | 'care' | 'shipping' | null>('craftsmanship')

const sizeGuideVisible = ref(false)

interface SizeGuideRow {
  size: string
  neck: string
  weight: string
  bestFor: string
}

// Placeholder chart — will be replaced with real breed/weight data once the backend is wired up.
const sizeGuideRows: SizeGuideRow[] = [
  { size: 'XS', neck: '20–25 cm', weight: 'Up to 5 kg', bestFor: 'Toy breeds, kittens' },
  { size: 'S', neck: '25–33 cm', weight: '5–10 kg', bestFor: 'Small breeds, cats' },
  { size: 'M', neck: '33–43 cm', weight: '10–25 kg', bestFor: 'Medium breeds' },
  { size: 'L', neck: '43–56 cm', weight: '25–45 kg', bestFor: 'Large breeds' },
]

function togglePanel(panel: 'craftsmanship' | 'care' | 'shipping') {
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
  return `$${value.toFixed(2)}`
}

function addToCart() {
  ElMessage.success(
    `Added "${product.value.name}" (${selectedColor.value}, ${selectedSize.value}) to cart`,
  )
}

function addToWishlist() {
  ElMessage.success(`Added "${product.value.name}" to wishlist`)
}
</script>

<template>
  <div class="product-detail">
    <div class="detail-top">
      <div class="gallery">
        <div class="gallery-image placeholder-img"></div>
        <div class="gallery-image placeholder-img"></div>
        <div class="gallery-image placeholder-img"></div>
        <div class="gallery-image placeholder-img"></div>
      </div>

      <div class="info">
        <p class="eyebrow">{{ product.category.toUpperCase() }}</p>
        <h1 class="product-name">{{ product.name }}</h1>
        <p class="price">{{ formatPrice(product.price) }}</p>

        <div class="divider"></div>

        <div class="option-group">
          <p class="option-label">COLOR: {{ selectedColor.toUpperCase() }}</p>
          <div class="swatches">
            <button
              v-for="c in product.colors"
              :key="c.name"
              type="button"
              class="swatch"
              :class="{ 'is-active': selectedColor === c.name }"
              :style="{ backgroundColor: c.hex }"
              :aria-label="c.name"
              @click="selectedColor = c.name"
            ></button>
          </div>
        </div>

        <div class="option-group">
          <div class="option-header">
            <p class="option-label">SELECT SIZE</p>
            <button type="button" class="size-guide-link" @click="sizeGuideVisible = true">SIZE GUIDE</button>
          </div>
          <div class="sizes">
            <button
              v-for="s in product.sizes"
              :key="s"
              type="button"
              class="size-btn"
              :class="{ 'is-active': selectedSize === s }"
              @click="selectedSize = s"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <button type="button" class="add-to-cart-btn" @click="addToCart">ADD TO CART</button>
        <button type="button" class="wishlist-btn" @click="addToWishlist">WISHLIST</button>

        <ul class="perks">
          <li>
            <PhTruck :size="18" />
            <span>Complimentary Express Shipping</span>
          </li>
          <li>
            <PhShieldCheck :size="18" />
            <span>Lifetime Leather Warranty</span>
          </li>
        </ul>
      </div>
    </div>

    <section class="details-care">
      <div class="accordion-col">
        <h2 class="section-title">Details &amp; Care</h2>

        <div class="accordion-item">
          <button type="button" class="accordion-header" @click="togglePanel('craftsmanship')">
            <span>CRAFTSMANSHIP</span>
            <PhCaretDown :size="16" class="accordion-caret" :class="{ 'is-open': openPanel === 'craftsmanship' }" />
          </button>
          <Transition @enter="onPanelEnter" @after-enter="onPanelAfterEnter" @leave="onPanelLeave">
            <div v-if="openPanel === 'craftsmanship'" class="accordion-content">
              <p class="accordion-body">{{ product.craftsmanship }}</p>
            </div>
          </Transition>
        </div>

        <div class="accordion-item">
          <button type="button" class="accordion-header" @click="togglePanel('care')">
            <span>CARE INSTRUCTIONS</span>
            <PhCaretDown :size="16" class="accordion-caret" :class="{ 'is-open': openPanel === 'care' }" />
          </button>
          <Transition @enter="onPanelEnter" @after-enter="onPanelAfterEnter" @leave="onPanelLeave">
            <div v-if="openPanel === 'care'" class="accordion-content">
              <p class="accordion-body">{{ product.care }}</p>
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
              <p class="accordion-body">{{ product.shipping }}</p>
            </div>
          </Transition>
        </div>
      </div>

      <div class="details-image placeholder-img"></div>
    </section>

    <section class="related">
      <div class="related-header">
        <div>
          <p class="eyebrow">COMPLETE THE LOOK</p>
          <h2 class="section-title">Related Essentials</h2>
        </div>
        <RouterLink to="/products" class="view-all-link">VIEW ALL</RouterLink>
      </div>

      <div class="related-grid">
        <RouterLink
          v-for="p in relatedProducts"
          :key="p.id"
          :to="`/products/${p.id}`"
          class="related-card"
        >
          <div class="related-image placeholder-img"></div>
          <div class="related-info">
            <p class="related-category">{{ p.category.toUpperCase() }}</p>
            <h3 class="related-name">{{ p.name }}</h3>
            <p class="related-price">{{ formatPrice(p.price) }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <el-dialog
      v-model="sizeGuideVisible"
      title="Size Guide"
      width="480px"
      class="size-guide-dialog"
      align-center
    >
      <p class="size-guide-intro">
        Approximate sizing based on neck circumference and weight. Exact fit varies by breed —
        measure your pet before ordering.
      </p>
      <table class="size-guide-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Neck</th>
            <th>Weight</th>
            <th>Best For</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sizeGuideRows" :key="row.size">
            <td class="size-guide-size">{{ row.size }}</td>
            <td>{{ row.neck }}</td>
            <td>{{ row.weight }}</td>
            <td>{{ row.bestFor }}</td>
          </tr>
        </tbody>
      </table>
      <p class="size-guide-note">
        Sizes shown are placeholder estimates and will be refined once verified breed and weight
        data is available.
      </p>
    </el-dialog>
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

.size-guide-link {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-decoration: underline;
  color: var(--color-text);
  cursor: pointer;
}

.swatches {
  display: flex;
  gap: 0.6rem;
}

.swatch {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-border);
  padding: 0;
  cursor: pointer;
}

.swatch.is-active {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.sizes {
  display: flex;
  gap: 0.6rem;
}

.size-btn {
  flex: 1;
  height: 2.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.size-btn:hover {
  border-color: var(--color-accent);
}

.size-btn.is-active {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
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

/* Size guide dialog */
.size-guide-intro {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
  margin-bottom: 1.25rem;
}

.size-guide-table {
  width: 100%;
  border-collapse: collapse;
}

.size-guide-table th,
.size-guide-table td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.size-guide-table th {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--color-heading);
  opacity: 0.7;
}

.size-guide-size {
  font-weight: 600;
  color: var(--color-heading);
}

.size-guide-note {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 1.25rem;
}
</style>
