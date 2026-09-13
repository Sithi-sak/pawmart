<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  PhCaretDown,
  PhTruck,
  PhShieldCheck,
  PhStorefront,
  PhStar,
  PhStarHalf,
  PhMegaphone,
} from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { effectivePrice, fetchProductBySlug, fetchRelatedProducts, type Product } from '@/lib/products'
import { fetchRecommendedProducts } from '@/lib/recommendations'
import {
  fetchProductReviews,
  createProductReview,
  ratingSummary,
  type ProductReview,
} from '@/lib/reviews'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
const auth = useAuthStore()

const props = defineProps<{ slug?: string }>()

const product = ref<Product | null>(null)
const relatedProducts = ref<Product[]>([])
const recommendedProducts = ref<Product[]>([])
const personalized = ref(false)
const loading = ref(true)
const loadError = ref(false)
const quantity = ref(1)

const selectedOptions = ref<Record<number, number>>({})

function selectOption(groupId: number, valueId: number) {
  selectedOptions.value[groupId] = valueId
}

function selectedOptionsSummary(): string[] {
  if (!product.value?.product_option_groups) return []
  return product.value.product_option_groups
    .map((group) => {
      const valueId = selectedOptions.value[group.id]
      const value = group.product_option_values.find((v) => v.id === valueId)
      return value ? `${group.name}: ${value.value}` : null
    })
    .filter((label): label is string => !!label)
}

const reviews = ref<ProductReview[]>([])
const reviewSummary = computed(() => ratingSummary(reviews.value))
const reviewRating = ref(0)
const reviewHoverRating = ref(0)
const reviewComment = ref('')
const submittingReview = ref(false)

const myReview = computed(() =>
  auth.customer ? reviews.value.find((r) => r.customer_id === auth.customer!.id) : undefined,
)

async function loadProduct(slug: string | undefined) {
  loading.value = true
  loadError.value = false
  product.value = null
  relatedProducts.value = []
  recommendedProducts.value = []
  personalized.value = false
  reviews.value = []
  reviewRating.value = 0
  reviewComment.value = ''
  quantity.value = 1
  selectedOptions.value = {}

  if (!slug) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    const found = await fetchProductBySlug(slug)
    product.value = found
    if (found) {
      await auth.init()
      const [related, recommended, productReviews] = await Promise.all([
        fetchRelatedProducts(found.category_id, found.id),
        fetchRecommendedProducts(auth.customer?.id ?? null, { excludeProductId: found.id, limit: 4 }),
        fetchProductReviews(found.id),
      ])
      relatedProducts.value = related
      recommendedProducts.value = recommended.products
      personalized.value = recommended.personalized
      reviews.value = productReviews
      for (const group of found.product_option_groups ?? []) {
        const first = group.product_option_values[0]
        if (first) {
          selectedOptions.value[group.id] = first.id
        }
      }
    }
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function submitReview() {
  if (!product.value || !auth.customer || reviewRating.value < 1) return

  submittingReview.value = true
  try {
    const created = await createProductReview({
      product_id: product.value.id,
      customer_id: auth.customer.id,
      reviewer_name: auth.customer.full_name || 'PawMart Customer',
      rating: reviewRating.value,
      comment: reviewComment.value.trim() || null,
    })
    reviews.value.unshift(created)
    reviewRating.value = 0
    reviewComment.value = ''
    ElMessage.success('Thanks for your review!')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not submit your review.')
  } finally {
    submittingReview.value = false
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

async function addToCart() {
  if (!product.value) return

  if (cart.conflictsWithCart(product.value)) {
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

  cart.addItem(product.value, quantity.value)
  const optionsLabel = selectedOptionsSummary().join(', ')
  ElMessage.success(
    `Added ${quantity.value} × "${product.value.name}"${optionsLabel ? ` (${optionsLabel})` : ''} to cart`,
  )
}

function addToWishlist() {
  if (!product.value) return
  ElMessage.success(`Added "${product.value.name}" to wishlist`)
}
</script>

<template>
  <div class="product-detail">
    <div v-if="loading" class="detail-top">
      <div class="gallery">
        <el-skeleton v-for="n in 4" :key="n" animated>
          <template #template>
            <el-skeleton-item variant="image" class="gallery-image" />
          </template>
        </el-skeleton>
      </div>

      <div class="info">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" class="sk-eyebrow" />
            <el-skeleton-item variant="h1" class="sk-product-name" />
            <el-skeleton-item variant="text" class="sk-price" />
            <el-skeleton-item variant="text" class="sk-sold-by" />
            <div class="divider"></div>
            <el-skeleton-item variant="text" class="sk-stock" />
            <el-skeleton-item variant="button" class="sk-add-btn" />
            <el-skeleton-item variant="button" class="sk-wishlist-btn" />
          </template>
        </el-skeleton>
      </div>
    </div>

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

          <a href="#reviews" class="rating-row">
            <span class="stars" aria-hidden="true">
              <template v-for="n in 5" :key="n">
                <PhStar v-if="reviewSummary.average >= n" weight="fill" :size="15" />
                <PhStarHalf v-else-if="reviewSummary.average >= n - 0.5" weight="fill" :size="15" />
                <PhStar v-else weight="regular" :size="15" />
              </template>
            </span>
            <span class="rating-count">
              {{
                reviewSummary.count
                  ? `${reviewSummary.average.toFixed(1)} (${reviewSummary.count} review${reviewSummary.count === 1 ? '' : 's'})`
                  : 'No reviews yet'
              }}
            </span>
          </a>

          <div class="price-row">
            <p class="price">{{ formatPrice(effectivePrice(product)) }}</p>
            <template v-if="product.is_discounted && product.discount_percent">
              <p class="price-original">{{ formatPrice(product.price) }}</p>
              <span class="discount-pill">-{{ Math.round(product.discount_percent) }}%</span>
            </template>
          </div>

          <div v-if="product.is_promotional" class="promo-banner">
            <PhMegaphone :size="18" weight="fill" />
            <span>{{ product.promotion_note || 'This item is part of a special promotion.' }}</span>
          </div>

          <div v-if="product.stores" class="sold-by-row">
            <div
              class="sold-by-avatar placeholder-img"
              :style="product.stores.logo_url ? { backgroundImage: `url(${product.stores.logo_url})` } : undefined"
            >
              <PhStorefront v-if="!product.stores.logo_url" :size="11" />
            </div>
            <RouterLink :to="`/store/${product.stores.slug}`" class="sold-by-link">
              Sold by {{ product.stores.name }}
            </RouterLink>
          </div>

          <div class="divider"></div>

          <p class="stock-status" :class="{ 'is-out': product.stock <= 0 }">
            {{ product.stock > 0 ? `${product.stock} in stock` : 'Out of stock' }}
          </p>

          <div v-for="group in product.product_option_groups" :key="group.id" class="option-group">
            <p class="option-label">{{ group.name.toUpperCase() }}</p>
            <div class="option-values">
              <button
                v-for="value in group.product_option_values"
                :key="value.id"
                type="button"
                class="option-value-btn"
                :class="{ 'is-selected': selectedOptions[group.id] === value.id }"
                @click="selectOption(group.id, value.id)"
              >
                {{ value.value }}
              </button>
            </div>
          </div>

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

      <section id="reviews" class="reviews-section">
        <div class="reviews-header">
          <h2 class="section-title">Reviews</h2>
          <div v-if="reviewSummary.count" class="reviews-summary">
            <span class="stars" aria-hidden="true">
              <template v-for="n in 5" :key="n">
                <PhStar v-if="reviewSummary.average >= n" weight="fill" :size="16" />
                <PhStarHalf v-else-if="reviewSummary.average >= n - 0.5" weight="fill" :size="16" />
                <PhStar v-else weight="regular" :size="16" />
              </template>
            </span>
            <span>
              {{ reviewSummary.average.toFixed(1) }} out of 5 · {{ reviewSummary.count }} review{{
                reviewSummary.count === 1 ? '' : 's'
              }}
            </span>
          </div>
        </div>

        <div class="review-form-card">
          <p v-if="!auth.customer" class="review-signin-prompt">
            <RouterLink to="/login" class="view-all-link">Sign in</RouterLink> to write a review.
          </p>
          <p v-else-if="myReview" class="review-signin-prompt">You've already reviewed this product. Thanks!</p>
          <template v-else>
            <p class="option-label">YOUR RATING</p>
            <div class="star-picker">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="star-picker-btn"
                @click="reviewRating = n"
                @mouseenter="reviewHoverRating = n"
                @mouseleave="reviewHoverRating = 0"
              >
                <PhStar :weight="(reviewHoverRating || reviewRating) >= n ? 'fill' : 'regular'" :size="22" />
              </button>
            </div>
            <el-input
              v-model="reviewComment"
              type="textarea"
              :rows="3"
              placeholder="Share your thoughts about this product (optional)"
              class="review-textarea"
            />
            <button
              type="button"
              class="add-to-cart-btn review-submit-btn"
              :disabled="reviewRating < 1 || submittingReview"
              @click="submitReview"
            >
              {{ submittingReview ? 'SUBMITTING…' : 'SUBMIT REVIEW' }}
            </button>
          </template>
        </div>

        <div v-if="reviews.length" class="review-list">
          <div v-for="r in reviews" :key="r.id" class="review-item">
            <div class="review-item-header">
              <span class="stars" aria-hidden="true">
                <PhStar v-for="n in 5" :key="n" :weight="r.rating >= n ? 'fill' : 'regular'" :size="14" />
              </span>
              <span class="review-author">{{ r.reviewer_name }}</span>
              <span class="review-date">{{ new Date(r.created_at).toLocaleDateString() }}</span>
            </div>
            <p v-if="r.comment" class="review-comment">{{ r.comment }}</p>
          </div>
        </div>
        <p v-else class="review-empty">No reviews yet — be the first to review this product.</p>
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

      <section v-if="personalized && recommendedProducts.length" class="related">
        <div class="related-header">
          <div>
            <p class="eyebrow">PICKED FOR YOUR PETS</p>
            <h2 class="section-title">Recommended For You</h2>
          </div>
        </div>

        <div class="related-grid">
          <RouterLink
            v-for="p in recommendedProducts"
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
  margin-top: 0.5rem;
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
  height: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
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

.sk-eyebrow {
  width: 90px;
  margin-bottom: 0.75rem;
}

.sk-product-name {
  width: 80%;
  margin-bottom: 0.75rem;
}

.sk-price {
  width: 30%;
  margin-bottom: 0.5rem;
}

.sk-sold-by {
  width: 40%;
  margin-bottom: 1.25rem;
}

.sk-stock {
  width: 35%;
  margin-bottom: 1.25rem;
}

.sk-add-btn {
  display: block;
  width: 100%;
  height: 3rem;
  margin-bottom: 0.75rem;
}

.sk-wishlist-btn {
  display: block;
  width: 100%;
  height: 3rem;
}

.info {
  max-width: 420px;
}

.product-name {
  font-size: 2.75rem;
  line-height: 1.1;
  margin-bottom: 0.75rem;
}

.price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.price {
  font-size: 1.1rem;
  color: var(--color-heading);
}

.price-original {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.5;
  text-decoration: line-through;
}

.discount-pill {
  display: inline-flex;
  align-items: center;
  height: 1.5rem;
  padding: 0 0.55rem;
  background: #c0392b;
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  font-weight: 600;
  line-height: 0;
}

.promo-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  margin-bottom: 1.25rem;
  background: #eaf1fb;
  color: #2b6cb0;
  font-size: 0.82rem;
}

@media (prefers-color-scheme: dark) {
  .discount-pill {
    background: rgba(192, 57, 43, 0.85);
  }

  .promo-banner {
    background: rgba(43, 108, 176, 0.2);
    color: #8fb7e3;
  }
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  margin-bottom: 0.6rem;
  width: fit-content;
}

.stars {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  color: var(--color-accent);
}

.rating-count {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.7;
  text-decoration: underline;
}

.sold-by-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
}

.sold-by-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  color: rgba(0, 0, 0, 0.35);
}

.sold-by-link {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-accent);
  text-decoration: underline;
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

.option-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.option-value-btn {
  min-width: 2.75rem;
  height: 2.5rem;
  padding: 0 0.9rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.option-value-btn:hover {
  border-color: var(--color-accent);
}

.option-value-btn.is-selected {
  border-color: var(--color-heading);
  background: var(--color-heading);
  color: var(--color-background);
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
  height: 2.5rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
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
  height: 2.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-heading);
  color: var(--color-heading);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.125rem;
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

/* Reviews */
.reviews-section {
  max-width: 720px;
  margin-bottom: 4rem;
}

.reviews-header {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.reviews-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

.review-form-card {
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.review-signin-prompt {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

.star-picker {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  width: fit-content;
}

.star-picker-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-accent);
  line-height: 0;
}

.review-textarea {
  margin-bottom: 1rem;
}

.review-submit-btn {
  width: auto;
  min-width: 180px;
  padding: 0 1.5rem;
  margin-bottom: 0;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-item {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.review-item-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.review-author {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.review-date {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
}

.review-comment {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.85;
}

.review-empty {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
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
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
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
