<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhHeart } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { fetchRecommendedProducts } from '@/lib/recommendations'
import { usePetsStore } from '@/stores/pets'
import type { Product } from '@/lib/products'
import petCareImg from '@/assets/images/pet_care.jpg'
import bedImg from '@/assets/images/bed.jpg'
import essentialsImg from '@/assets/images/essentials.png'
import nutritionImg from '@/assets/images/nutrition.jpg'
import lifestyleImg from '@/assets/images/lifestyle.png'
import heroVideo from '@/assets/hero_video.mp4'

const auth = useAuthStore()
const cart = useCartStore()
const wishlist = useWishlistStore()
const pets = usePetsStore()

interface Collection {
  key: string
  title: string
  subtitle: string
  label?: string
  featured?: boolean
  image: string
  to: { path: string; query: Record<string, string> }
}

const collections: Collection[] = [
  {
    key: 'featured',
    title: 'Comfort Beds',
    subtitle: 'Shop Premium Bedding',
    label: 'FEATURED',
    featured: true,
    image: bedImg,
    to: { path: '/products', query: { q: 'bed' } },
  },
  {
    key: 'essentials',
    title: 'Essentials',
    subtitle: 'Bowls, Leashes & More',
    image: essentialsImg,
    to: { path: '/products', query: { category: 'Pet Supplies' } },
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    subtitle: 'Food & Supplements',
    image: nutritionImg,
    to: { path: '/products', query: { category: 'Pet Food' } },
  },
  {
    key: 'lifestyle',
    title: 'Lifestyle',
    subtitle: 'Toys & Enrichment',
    image: lifestyleImg,
    to: { path: '/products', query: { category: 'Pet Training Aids' } },
  },
]

const recommendedProducts = ref<Product[]>([])
const personalized = ref(false)
const loadingRecommendations = ref(true)

onMounted(async () => {
  await auth.init()
  try {
    const result = await fetchRecommendedProducts(auth.customer?.id ?? null, { limit: 4 })
    recommendedProducts.value = result.products
    personalized.value = result.personalized
  } catch {
    recommendedProducts.value = []
  } finally {
    loadingRecommendations.value = false
  }
})

// Naming the pets makes the personalization visible -- otherwise the section
// looks identical to the guest "New Arrivals" list.
const recommendationSubtitle = computed(() => {
  if (!personalized.value) return 'Fresh picks for every paw.'
  const names = pets.pets.map((pet) => pet.name)
  if (!names.length) return 'Picked based on your pets and past orders.'
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `Picked for ${list}, based on your pets and past orders.`
})

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
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

function toggleWishlist(p: Product) {
  const added = wishlist.toggle(p)
  ElMessage.success(added ? `Added "${p.name}" to wishlist` : `Removed "${p.name}" from wishlist`)
}
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <video class="hero-video" :src="heroVideo" autoplay muted loop playsinline></video>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1 class="hero-title">The Care Your Pet Deserves<br /></h1>
        <p class="hero-copy">
          We thoughtfully curate food, gear, and comfort for the animals who share our homes so that
          every pet can enjoy a life well lived.
        </p>
        <RouterLink to="/products">
          <el-button type="primary" class="accent-btn" size="large">EXPLORE COLLECTIONS</el-button>
        </RouterLink>
      </div>
    </section>

    <!-- Collections -->
    <section class="section">
      <h2 class="section-title">Collections</h2>
      <div class="collections-grid">
        <RouterLink
          v-for="c in collections"
          :key="c.key"
          :to="c.to"
          class="collection-card"
          :class="[`collection-card--${c.key}`, { 'is-featured': c.featured }]"
          :style="{ '--collection-image': `url(${c.image})` }"
        >
          <div class="collection-image"></div>
          <span v-if="c.label" class="collection-tag">{{ c.label }}</span>
          <div class="collection-info">
            <h3>{{ c.title }}</h3>
            <p>{{ c.subtitle }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- Recommended products -->
    <section
      v-if="loadingRecommendations || recommendedProducts.length"
      class="section section-soft"
    >
      <div class="section-header">
        <div>
          <h2 class="section-title">{{ personalized ? 'Recommended For You' : 'New Arrivals' }}</h2>
          <p class="section-subtitle">
            {{ recommendationSubtitle }}
          </p>
        </div>
        <RouterLink to="/products" class="view-all-link">View All Products</RouterLink>
      </div>
      <div v-if="loadingRecommendations" class="products-grid">
        <div v-for="n in 4" :key="n" class="product-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" class="product-image" />
              <el-skeleton-item variant="text" class="sk-category" />
              <el-skeleton-item variant="h3" class="sk-name" />
              <el-skeleton-item variant="text" class="sk-price" />
            </template>
          </el-skeleton>
        </div>
      </div>
      <div v-else class="products-grid">
        <RouterLink
          v-for="p in recommendedProducts"
          :key="p.id"
          :to="`/products/${p.slug}`"
          class="product-card"
        >
          <div
            class="product-image"
            :class="{ 'placeholder-img': !p.images.length }"
            :style="p.images.length ? { backgroundImage: `url(${p.images[0]})` } : undefined"
          >
            <span v-if="pets.matchLabel(p)" class="pet-badge">{{ pets.matchLabel(p) }}</span>
            <button
              type="button"
              class="wishlist-btn"
              :class="{ 'is-active': wishlist.has(p.id) }"
              @click.stop.prevent="toggleWishlist(p)"
            >
              <PhHeart :size="18" :weight="wishlist.has(p.id) ? 'fill' : 'regular'" />
            </button>
          </div>
          <p class="product-category">{{ p.categories?.name ?? p.species }}</p>
          <h3 class="product-name">{{ p.name }}</h3>
          <div class="product-footer">
            <p class="product-price">{{ formatPrice(p.price) }}</p>
            <button type="button" class="cart-btn" @click.stop.prevent="addToCart(p)">
              Add to Cart
            </button>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- Philosophy -->
    <section class="section philosophy">
      <div class="philosophy-media">
        <div class="philosophy-image" :style="{ backgroundImage: `url(${petCareImg})` }"></div>
        <div class="philosophy-accent"></div>
      </div>
      <div class="philosophy-content">
        <p class="eyebrow">Our Philosophy</p>
        <h2 class="section-title">Every Pet, Well Cared For</h2>
        <p>
          We believe pet care should be simple, honest, and built around what animals actually need.
          Every product on PawMart is chosen with that in mind.
        </p>
        <p>
          From everyday essentials to seasonal comforts, we work to make caring for your pet feel
          less like a chore and more like an act of love.
        </p>
        <RouterLink to="/about">
          <el-button class="dark-btn" size="large">Learn More About Us</el-button>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
}

.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

.section {
  padding: 3.5rem 0;
}

.section-soft {
  background: var(--color-background-soft);
  margin: 0 calc(-1 * 1.5rem);
  padding: 3.5rem 1.5rem;
}

.section-title {
  font-size: 2rem;
  position: relative;
  padding-bottom: 0.75rem;
  margin-bottom: 1.5rem;
}

.section-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 3rem;
  height: 2px;
  background: var(--color-accent);
}

.section-subtitle {
  color: var(--color-text);
  opacity: 0.7;
}

.accent-italic {
  color: var(--color-accent);
  font-style: italic;
}

.accent-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.accent-btn:hover {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

.dark-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
}

.dark-btn:hover {
  background: #333;
  color: #fff;
}

/* Hero */
.hero {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
  margin: -1.5rem calc(-1 * 1.5rem) 0;
  padding: 3rem;
  overflow: hidden;
}

.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 480px;
}

.hero-title {
  font-size: 3.2rem;
  line-height: 1.15;
  margin-bottom: 1rem;
  color: #fff;
}

.hero-copy {
  margin-bottom: 1.5rem;
  color: #fff;
}

/* Collections */
.collections-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 280px);
  grid-template-areas:
    'featured featured essentials'
    'nutrition lifestyle lifestyle';
  gap: 1rem;
}

.collection-card {
  position: relative;
  display: block;
  text-decoration: none;
  color: #fff;
  overflow: hidden;
}

.collection-image {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(transparent 40%, rgba(0, 0, 0, 0.65) 100%), var(--collection-image);
  background-size: cover;
  background-position: center;
  transition: transform 0.35s ease;
}

.collection-card:hover .collection-image {
  transform: scale(1.08);
}

.collection-card--featured {
  grid-area: featured;
}

.collection-card--essentials {
  grid-area: essentials;
}

.collection-card--nutrition {
  grid-area: nutrition;
}

.collection-card--lifestyle {
  grid-area: lifestyle;
}

.collection-tag {
  position: absolute;
  z-index: 1;
  top: 1rem;
  left: 1rem;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.6rem;
}

.collection-info {
  position: absolute;
  z-index: 1;
  left: 1.25rem;
  bottom: 1.25rem;
}

.collection-info h3 {
  font-size: 1.5rem;
  margin-bottom: 0.15rem;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.collection-info p {
  font-size: 0.875rem;
  letter-spacing: 0.03em;
  opacity: 0.9;
}

/* Seasonal products */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.section-header .section-title {
  margin-bottom: 0.35rem;
}

.view-all-link {
  color: var(--color-text);
  text-decoration: underline;
  white-space: nowrap;
  font-size: 1rem;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.product-card {
  display: block;
  text-decoration: none;
  color: var(--color-text);
}

.product-image {
  position: relative;
  aspect-ratio: 1 / 1;
  height: auto;
  margin-bottom: 0.75rem;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
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

.wishlist-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  cursor: pointer;
  transition: color 0.2s ease;
}

.wishlist-btn:hover {
  color: var(--color-accent);
}

.wishlist-btn.is-active {
  color: var(--color-accent);
}

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.cart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  padding: 0 0.9rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.cart-btn:hover {
  background: var(--color-accent-dark);
}

.product-category {
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  opacity: 0.6;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.product-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--color-heading);
}

.product-price {
  color: var(--color-accent);
  font-weight: 600;
}

.sk-category {
  width: 40%;
  margin-bottom: 0.5rem;
}

.sk-name {
  width: 75%;
  margin-bottom: 0.5rem;
}

.sk-price {
  width: 35%;
}

/* Philosophy */
.philosophy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.philosophy-media {
  position: relative;
}

.philosophy-image {
  aspect-ratio: 4 / 5;
  position: relative;
  z-index: 1;
  background-size: cover;
  background-position: center;
}

.philosophy-accent {
  position: absolute;
  bottom: -1.5rem;
  right: -1.5rem;
  width: 45%;
  height: 45%;
  background: var(--color-accent);
  z-index: 0;
}

.philosophy-content .eyebrow {
  color: var(--color-accent);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.philosophy-content p {
  margin-bottom: 1rem;
  color: var(--color-text);
}

@media (max-width: 900px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .collections-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas: none;
  }

  .collection-card {
    height: 220px;
  }

  .philosophy {
    grid-template-columns: 1fr;
  }
}
</style>
