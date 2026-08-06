<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Collection {
  key: string
  title: string
  subtitle: string
  label?: string
  featured?: boolean
}

const collections: Collection[] = [
  { key: 'featured', title: 'Comfort Beds', subtitle: 'Shop Premium Bedding', label: 'FEATURED', featured: true },
  { key: 'essentials', title: 'Essentials', subtitle: 'Bowls, Leashes & More' },
  { key: 'nutrition', title: 'Nutrition', subtitle: 'Food & Supplements' },
  { key: 'lifestyle', title: 'Lifestyle', subtitle: 'Toys & Enrichment' },
]

interface Product {
  id: number
  category: string
  name: string
  price: number
}

const seasonalProducts: Product[] = [
  { id: 1, category: 'Accessories', name: 'Woven Collar', price: 18.0 },
  { id: 2, category: 'Bedding', name: 'Plush Nest Bed', price: 54.0 },
  { id: 3, category: 'Nutrition', name: 'Grain-Free Kibble', price: 32.0 },
  { id: 4, category: 'Lifestyle', name: 'Rope Chew Toy', price: 14.0 },
]

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero placeholder-img">
      <div class="hero-content">
        <h1 class="hero-title">
          THE ART OF<br />
          <span class="accent-italic">PET LIVING.</span>
        </h1>
        <p class="hero-copy">
          Thoughtfully curated food, gear, and comfort for the animals who share our homes —
          because every pet deserves a life well lived.
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
          to="/products"
          class="collection-card placeholder-img"
          :class="[`collection-card--${c.key}`, { 'is-featured': c.featured }]"
        >
          <span v-if="c.label" class="collection-tag">{{ c.label }}</span>
          <div class="collection-info">
            <h3>{{ c.title }}</h3>
            <p>{{ c.subtitle }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- Seasonal releases -->
    <section class="section section-soft">
      <div class="section-header">
        <div>
          <h2 class="section-title">Seasonal Releases</h2>
          <p class="section-subtitle">Fresh picks for every paw, this season.</p>
        </div>
        <RouterLink to="/products" class="view-all-link">View All Products</RouterLink>
      </div>
      <div class="products-grid">
        <RouterLink
          v-for="p in seasonalProducts"
          :key="p.id"
          :to="`/products/${p.id}`"
          class="product-card"
        >
          <div class="product-image placeholder-img"></div>
          <p class="product-category">{{ p.category }}</p>
          <h3 class="product-name">{{ p.name }}</h3>
          <p class="product-price">{{ formatPrice(p.price) }}</p>
        </RouterLink>
      </div>
    </section>

    <!-- Philosophy -->
    <section class="section philosophy">
      <div class="philosophy-media">
        <div class="philosophy-image placeholder-img"></div>
        <div class="philosophy-accent"></div>
      </div>
      <div class="philosophy-content">
        <p class="eyebrow">Our Philosophy</p>
        <h2 class="section-title">Every Pet, Well Cared For</h2>
        <p>
          We believe pet care should be simple, honest, and built around what animals actually
          need. Every product on PawMart is chosen with that in mind.
        </p>
        <p>
          From everyday essentials to seasonal comforts, we work to make caring for your pet feel
          less like a chore and more like an act of love.
        </p>
        <el-button class="dark-btn" size="large">Learn More About Us</el-button>
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

@media (prefers-color-scheme: dark) {
  .placeholder-img {
    background: linear-gradient(180deg, #4a4a4a 0%, #2c2c2c 100%);
  }
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
  min-height: 480px;
  display: flex;
  align-items: center;
  margin: -1.5rem calc(-1 * 1.5rem) 0;
  padding: 3rem;
}

.hero-content {
  max-width: 480px;
}

.hero-title {
  font-size: 2.75rem;
  line-height: 1.15;
  margin-bottom: 1rem;
}

.hero-copy {
  margin-bottom: 1.5rem;
  color: var(--color-text);
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
  left: 1.25rem;
  bottom: 1.25rem;
}

.collection-info h3 {
  font-size: 1.5rem;
  margin-bottom: 0.15rem;
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
  aspect-ratio: 1 / 1;
  margin-bottom: 0.75rem;
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
