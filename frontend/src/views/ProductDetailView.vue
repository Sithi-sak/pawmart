<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  PhCaretDown,
  PhTruck,
  PhShieldCheck,
  PhStorefront,
  PhStar,
  PhStarHalf,
  PhMegaphone,
  PhHeart,
  PhPencilSimpleLine,
  PhChatCircleText,
  PhPawPrint,
} from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  effectivePrice,
  fetchProductBySlug,
  fetchRelatedProducts,
  type Product,
} from '@/lib/products'
import { fetchRecommendedProducts } from '@/lib/recommendations'
import { usePetsStore } from '@/stores/pets'
import {
  fetchProductReviews,
  createProductReview,
  ratingSummary,
  type ProductReview,
} from '@/lib/reviews'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'

const cart = useCartStore()
const wishlist = useWishlistStore()
const auth = useAuthStore()
const pets = usePetsStore()
const router = useRouter()

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
const showReviewForm = ref(false)
const reviewSort = ref<'recent' | 'highest' | 'lowest'>('recent')
const ratingFilter = ref<number | null>(null)

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']
const REVIEW_COMMENT_LIMIT = 500

const myReview = computed(() =>
  auth.customer ? reviews.value.find((r) => r.customer_id === auth.customer!.id) : undefined,
)

// 5 -> 1 so the breakdown reads top-down like every other storefront.
const ratingBreakdown = computed(() =>
  [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.value.filter((r) => r.rating === stars).length
    return {
      stars,
      count,
      percent: reviews.value.length ? (count / reviews.value.length) * 100 : 0,
    }
  }),
)

const sortedReviews = computed(() => {
  const list = [...reviews.value]
  if (reviewSort.value === 'highest') return list.sort((a, b) => b.rating - a.rating)
  if (reviewSort.value === 'lowest') return list.sort((a, b) => a.rating - b.rating)
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const visibleReviews = computed(() =>
  ratingFilter.value
    ? sortedReviews.value.filter((r) => r.rating === ratingFilter.value)
    : sortedReviews.value,
)

function toggleRatingFilter(stars: number) {
  ratingFilter.value = ratingFilter.value === stars ? null : stars
}

function reviewInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?'
  )
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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
  showReviewForm.value = false
  reviewSort.value = 'recent'
  ratingFilter.value = null
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
        fetchRecommendedProducts(auth.customer?.id ?? null, {
          excludeProductId: found.id,
          limit: 4,
        }),
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
    showReviewForm.value = false
    ElMessage.success('Thanks for your review!')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not submit your review.')
  } finally {
    submittingReview.value = false
  }
}

onMounted(() => loadProduct(props.slug))
watch(() => props.slug, loadProduct)

// The column beside the Details & Care accordion used to be a second photo,
// but the gallery above already shows every image a product has — so it
// carries the spec sheet instead, built from whatever fields are filled in.
const specs = computed(() => {
  const p = product.value
  if (!p) return []

  const rows: { label: string; value: string }[] = [
    { label: 'Brand', value: p.brand ?? '' },
    { label: 'For', value: p.species ?? '' },
    { label: 'Category', value: p.categories?.name ?? '' },
    { label: 'Sold by', value: p.stores?.name ?? '' },
    {
      label: 'Availability',
      value: p.stock > 0 ? `${p.stock} in stock` : 'Out of stock',
    },
    { label: 'Item no.', value: `PM-${String(p.id).padStart(4, '0')}` },
  ]

  return rows.filter((row) => row.value)
})

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

async function addProductToCart(): Promise<boolean> {
  if (!product.value) return false

  if (cart.conflictsWithCart(product.value)) {
    try {
      await ElMessageBox.confirm(
        `Your cart has items from ${cart.activeStoreName ?? 'another store'}. Clear it to add items from a different store?`,
        'Different Store',
        { confirmButtonText: 'Clear Cart & Add', cancelButtonText: 'Cancel', type: 'warning' },
      )
    } catch {
      return false
    }
    cart.clear()
  }

  cart.addItem(product.value, quantity.value)
  return true
}

async function addToCart() {
  if (!product.value) return
  const added = await addProductToCart()
  if (!added) return

  const optionsLabel = selectedOptionsSummary().join(', ')
  ElMessage.success(
    `Added ${quantity.value} × "${product.value.name}"${optionsLabel ? ` (${optionsLabel})` : ''} to cart`,
  )
}

async function buyNow() {
  if (!product.value) return
  const added = await addProductToCart()
  if (!added) return

  router.push({ name: 'checkout' })
}

function toggleWishlist() {
  if (!product.value) return
  const added = wishlist.toggle(product.value)
  ElMessage.success(
    added
      ? `Added "${product.value.name}" to wishlist`
      : `Removed "${product.value.name}" from wishlist`,
  )
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
            v-for="(src, i) in product.images.length
              ? product.images.slice(0, 4)
              : [null, null, null, null]"
            :key="i"
            class="gallery-image"
            :class="{ 'placeholder-img': !src }"
            :style="src ? { backgroundImage: `url(${src})` } : undefined"
          ></div>
        </div>

        <div class="info">
          <p class="eyebrow">
            {{ (product.categories?.name ?? product.species ?? '').toUpperCase() }}
          </p>
          <h1 class="product-name">{{ product.name }}</h1>

          <p v-if="pets.matchLabel(product)" class="pet-match">
            <PhPawPrint :size="15" weight="fill" />
            {{ pets.matchLabel(product) }} — matches your
            {{ product.species?.toLowerCase() }} profile
          </p>

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
              :style="
                product.stores.logo_url
                  ? { backgroundImage: `url(${product.stores.logo_url})` }
                  : undefined
              "
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
              <button
                type="button"
                class="qty-btn"
                :disabled="quantity <= 1"
                @click="decrementQuantity"
              >
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

          <div class="cart-actions-row">
            <button
              type="button"
              class="add-to-cart-btn"
              :disabled="product.stock <= 0"
              @click="addToCart"
            >
              {{ product.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK' }}
            </button>
            <button
              type="button"
              class="buy-now-btn"
              :disabled="product.stock <= 0"
              @click="buyNow"
            >
              BUY NOW
            </button>
          </div>
          <button
            type="button"
            class="wishlist-btn"
            :class="{ 'is-active': product && wishlist.has(product.id) }"
            @click="toggleWishlist"
          >
            <PhHeart
              :size="16"
              :weight="product && wishlist.has(product.id) ? 'fill' : 'regular'"
            />
            {{ product && wishlist.has(product.id) ? 'WISHLISTED' : 'WISHLIST' }}
          </button>

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
              <PhCaretDown
                :size="16"
                class="accordion-caret"
                :class="{ 'is-open': openPanel === 'description' }"
              />
            </button>
            <Transition
              @enter="onPanelEnter"
              @after-enter="onPanelAfterEnter"
              @leave="onPanelLeave"
            >
              <div v-if="openPanel === 'description'" class="accordion-content">
                <p class="accordion-body">
                  {{ product.description || 'No description available yet.' }}
                </p>
              </div>
            </Transition>
          </div>

          <div class="accordion-item">
            <button type="button" class="accordion-header" @click="togglePanel('shipping')">
              <span>SHIPPING &amp; RETURNS</span>
              <PhCaretDown
                :size="16"
                class="accordion-caret"
                :class="{ 'is-open': openPanel === 'shipping' }"
              />
            </button>
            <Transition
              @enter="onPanelEnter"
              @after-enter="onPanelAfterEnter"
              @leave="onPanelLeave"
            >
              <div v-if="openPanel === 'shipping'" class="accordion-content">
                <p class="accordion-body">
                  Complimentary express shipping on all orders within Cambodia, arriving in 2–4
                  business days. Returns are accepted within 30 days of delivery for unused items in
                  their original packaging.
                </p>
              </div>
            </Transition>
          </div>
        </div>

        <aside class="spec-card">
          <p class="spec-card-title">At a Glance</p>
          <dl class="spec-list">
            <div v-for="row in specs" :key="row.label" class="spec-row">
              <dt class="spec-label">{{ row.label }}</dt>
              <dd class="spec-value">{{ row.value }}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section id="reviews" class="reviews-section">
        <div class="reviews-layout">
          <aside class="reviews-rail">
            <h2 class="section-title reviews-rail-title">Customer reviews</h2>

            <div class="rail-score">
              <span class="stars" aria-hidden="true">
                <template v-for="n in 5" :key="n">
                  <PhStar v-if="reviewSummary.average >= n" weight="fill" :size="18" />
                  <PhStarHalf
                    v-else-if="reviewSummary.average >= n - 0.5"
                    weight="fill"
                    :size="18"
                  />
                  <PhStar v-else weight="regular" :size="18" />
                </template>
              </span>
              <span class="rail-score-value">
                {{
                  reviewSummary.count
                    ? `${reviewSummary.average.toFixed(1)} out of 5`
                    : 'Not rated yet'
                }}
              </span>
            </div>
            <p class="rail-count">
              {{ reviewSummary.count }} global rating{{ reviewSummary.count === 1 ? '' : 's' }}
            </p>

            <div class="rating-breakdown">
              <button
                v-for="row in ratingBreakdown"
                :key="row.stars"
                type="button"
                class="breakdown-row"
                :class="{ 'is-active': ratingFilter === row.stars, 'is-empty': !row.count }"
                :disabled="!row.count"
                @click="toggleRatingFilter(row.stars)"
              >
                <span class="breakdown-label">{{ row.stars }} star</span>
                <span class="breakdown-track">
                  <span class="breakdown-fill" :style="{ width: `${row.percent}%` }"></span>
                </span>
                <span class="breakdown-percent">{{ Math.round(row.percent) }}%</span>
              </button>
            </div>

            <div class="rail-divider"></div>

            <h3 class="rail-heading">Review this product</h3>
            <p class="rail-sub">Share your thoughts with other customers</p>
            <button
              v-if="auth.customer && !myReview"
              type="button"
              class="write-review-btn"
              @click="showReviewForm = true"
            >
              <PhPencilSimpleLine :size="15" />
              Write a customer review
            </button>
            <p v-else-if="!auth.customer" class="rail-note">
              <RouterLink to="/login" class="view-all-link">Sign in</RouterLink> to write a review.
            </p>
            <p v-else class="rail-note">You've already reviewed this product — thanks!</p>
          </aside>

          <div class="reviews-main">
            <div v-if="showReviewForm && auth.customer && !myReview" class="review-form-card">
              <h3 class="review-form-title">Write a review</h3>
              <p class="option-label">OVERALL RATING</p>
              <div class="star-picker-row">
                <div class="star-picker">
                  <button
                    v-for="n in 5"
                    :key="n"
                    type="button"
                    class="star-picker-btn"
                    :aria-label="`${n} star${n === 1 ? '' : 's'}`"
                    @click="reviewRating = n"
                    @mouseenter="reviewHoverRating = n"
                    @mouseleave="reviewHoverRating = 0"
                  >
                    <PhStar
                      :weight="(reviewHoverRating || reviewRating) >= n ? 'fill' : 'regular'"
                      :size="24"
                    />
                  </button>
                </div>
                <span class="star-picker-label">
                  {{
                    reviewHoverRating || reviewRating
                      ? RATING_LABELS[(reviewHoverRating || reviewRating) - 1]
                      : 'Select a rating'
                  }}
                </span>
              </div>

              <p class="option-label">ADD A WRITTEN REVIEW</p>
              <el-input
                v-model="reviewComment"
                type="textarea"
                :rows="4"
                :maxlength="REVIEW_COMMENT_LIMIT"
                show-word-limit
                placeholder="What did you and your pet think? Quality, value, delivery…"
                class="review-textarea"
              />

              <div class="review-form-actions">
                <button
                  type="button"
                  class="add-to-cart-btn review-submit-btn"
                  :disabled="reviewRating < 1 || submittingReview"
                  @click="submitReview"
                >
                  {{ submittingReview ? 'SUBMITTING…' : 'SUBMIT REVIEW' }}
                </button>
                <button type="button" class="review-cancel-btn" @click="showReviewForm = false">
                  Cancel
                </button>
              </div>
            </div>

            <template v-if="reviews.length">
              <el-select v-model="reviewSort" class="review-sort" size="default">
                <el-option label="Most recent" value="recent" />
                <el-option label="Top reviews" value="highest" />
                <el-option label="Lowest rated" value="lowest" />
              </el-select>

              <div class="review-list-heading">
                <h3 class="review-list-title">
                  {{ ratingFilter ? `${ratingFilter}-star reviews` : 'Top reviews' }}
                </h3>
                <button
                  v-if="ratingFilter"
                  type="button"
                  class="review-clear-filter"
                  @click="ratingFilter = null"
                >
                  Clear filter
                </button>
              </div>

              <div v-if="visibleReviews.length" class="review-list">
                <article v-for="r in visibleReviews" :key="r.id" class="review-item">
                  <div class="review-item-head">
                    <span class="review-avatar" aria-hidden="true">{{
                      reviewInitials(r.reviewer_name)
                    }}</span>
                    <span class="review-author">{{ r.reviewer_name }}</span>
                    <span
                      v-if="auth.customer && r.customer_id === auth.customer.id"
                      class="review-you"
                      >Your review</span
                    >
                  </div>
                  <div class="review-rating-row">
                    <span class="stars" :aria-label="`${r.rating} out of 5`">
                      <PhStar
                        v-for="n in 5"
                        :key="n"
                        :weight="r.rating >= n ? 'fill' : 'regular'"
                        :size="14"
                      />
                    </span>
                    <span class="review-title">{{ RATING_LABELS[r.rating - 1] }}</span>
                  </div>
                  <p class="review-date">Reviewed on {{ formatReviewDate(r.created_at) }}</p>
                  <p v-if="r.comment" class="review-comment">{{ r.comment }}</p>
                  <p v-else class="review-comment is-muted">No written feedback.</p>
                </article>
              </div>
              <p v-else class="review-filter-empty">
                No {{ ratingFilter }}-star reviews for this product yet.
              </p>
            </template>

            <div v-else class="review-empty">
              <PhChatCircleText :size="28" />
              <p class="review-empty-title">No customer reviews yet</p>
              <p class="review-empty-text">Be the first to review this product.</p>
            </div>
          </div>
        </div>
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
            >
              <span v-if="pets.matchLabel(p)" class="pet-badge">{{ pets.matchLabel(p) }}</span>
            </div>
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

.cart-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
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
}

.add-to-cart-btn:hover {
  background: var(--color-accent-dark);
}

.add-to-cart-btn:disabled {
  background: var(--color-border);
  cursor: not-allowed;
}

.buy-now-btn {
  display: block;
  width: 100%;
  height: 2.5rem;
  background: var(--color-heading);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  cursor: pointer;
}

.buy-now-btn:hover {
  opacity: 0.85;
}

.buy-now-btn:disabled {
  background: var(--color-border);
  cursor: not-allowed;
}

.wishlist-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.wishlist-btn.is-active {
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
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
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

.spec-card {
  align-self: start;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 1.75rem;
}

.spec-card-title {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-heading);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.spec-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-border);
}

.spec-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.spec-label {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  white-space: nowrap;
}

.spec-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: right;
}

/* Reviews */
.reviews-section {
  margin-bottom: 4rem;
}

.reviews-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
}

/* Left rail: score, breakdown, write-a-review */
.reviews-rail-title {
  margin-bottom: 0.75rem;
}

.rail-score {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
}

.rail-score-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.rail-count {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 1rem;
}

.rating-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.breakdown-row {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) 2.25rem;
  align-items: center;
  gap: 0.7rem;
  padding: 0.15rem 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.breakdown-row:disabled {
  cursor: default;
}

.breakdown-row:not(:disabled):hover .breakdown-label,
.breakdown-row.is-active .breakdown-label {
  color: var(--color-accent);
  text-decoration: underline;
}

.breakdown-label {
  opacity: 0.8;
}

.breakdown-track {
  height: 18px;
  background: var(--color-background-soft, #f2f2f2);
  border: 1px solid var(--color-border);
}

.breakdown-fill {
  display: block;
  height: 100%;
  background: var(--color-accent);
}

.breakdown-percent {
  text-align: right;
  opacity: 0.7;
}

.rail-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1.75rem 0 1.5rem;
}

.rail-heading {
  font-size: 1rem;
  color: var(--color-heading);
  margin-bottom: 0.3rem;
}

.rail-sub {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 1rem;
}

.rail-note {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.8;
}

.write-review-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 1.1rem;
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.write-review-btn:hover {
  background: var(--color-accent);
  color: #fff;
}

/* Right column: form + review list */
.review-form-card {
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.review-form-title {
  font-size: 1.1rem;
  color: var(--color-heading);
  margin-bottom: 1rem;
}

.star-picker-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.star-picker {
  display: flex;
  gap: 0.25rem;
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

.star-picker-label {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.7;
}

.review-textarea {
  margin-bottom: 1.25rem;
}

.review-form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.review-submit-btn {
  width: auto;
  min-width: 180px;
  padding: 0 1.5rem;
  margin-bottom: 0;
}

.review-cancel-btn {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
  text-decoration: underline;
}

.review-sort {
  width: 180px;
  margin-bottom: 1.75rem;
}

.review-list-heading {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.review-list-title {
  font-size: 1.05rem;
  color: var(--color-heading);
}

.review-clear-filter {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--color-accent);
  cursor: pointer;
  text-decoration: underline;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.review-item {
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--color-border);
}

.review-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.review-item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.review-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-heading);
  font-size: 0.68rem;
  font-weight: 600;
}

.review-author {
  font-size: 0.85rem;
  color: var(--color-text);
}

.review-you {
  padding: 0.15rem 0.45rem;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.review-rating-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.3rem;
}

.review-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.review-date {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-bottom: 0.65rem;
}

.review-comment {
  max-width: 80ch;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text);
  opacity: 0.85;
}

.review-comment.is-muted {
  font-style: italic;
  opacity: 0.5;
}

.review-filter-empty {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

.review-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 2.5rem 1.5rem;
  border: 1px dashed var(--color-border);
  text-align: center;
  color: var(--color-text);
}

.review-empty svg {
  color: var(--color-accent);
  margin-bottom: 0.25rem;
}

.review-empty-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
}

.review-empty-text {
  font-size: 0.82rem;
  opacity: 0.65;
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
  position: relative;
}

.pet-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
}

.pet-match {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  padding: 0.3rem 0.6rem;
  background: rgba(218, 109, 31, 0.1);
  color: var(--color-accent-dark);
  font-size: 0.8rem;
  font-weight: 600;
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

  .reviews-layout {
    grid-template-columns: 1fr;
    gap: 2.5rem;
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
