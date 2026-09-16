<script setup lang="ts">
import { RouterLink } from 'vue-router'
import collectionVideo from '@/assets/collection_video.mp4'
import dogImg from '@/assets/images/dog.png'
import catImg from '@/assets/images/cat.png'
import birdImg from '@/assets/images/bird.png'
import fishImg from '@/assets/images/fish.png'

interface Species {
  key: string
  label: string
  image: string
}

const speciesList: Species[] = [
  { key: 'dog', label: 'Dogs', image: dogImg },
  { key: 'cat', label: 'Cats', image: catImg },
  { key: 'bird', label: 'Birds', image: birdImg },
  { key: 'fish', label: 'Fish', image: fishImg },
]

interface Collection {
  key: string
  title: string
  description: string
}

const collections: Collection[] = [
  {
    key: 'new-arrivals',
    title: 'New Arrivals',
    description: 'The latest additions to the shelves — fresh gear, food, and comforts.',
  },
  {
    key: 'seasonal-favorites',
    title: 'Seasonal Favorites',
    description: 'Warm bedding, cozy layers, and treats picked for the season ahead.',
  },
  {
    key: 'trainers-picks',
    title: "Trainer's Picks",
    description: 'Recommended toys and tools our in-house trainers reach for first.',
  },
  {
    key: 'small-pet-essentials',
    title: 'Small Pet Essentials',
    description: 'Habitats, bedding, and enrichment sized for rabbits, birds, and more.',
  },
]
</script>

<template>
  <div class="collections">
    <!-- Hero -->
    <section class="hero">
      <video class="hero-video" :src="collectionVideo" autoplay muted loop playsinline></video>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1 class="hero-title">
          EVERY COMPANION,<br />
          <span class="accent-italic">ITS OWN COLLECTION.</span>
        </h1>
        <p class="hero-copy">
          Browse curated groupings of food, gear, and comfort — organized by species, then by
          the moments that matter most.
        </p>
        <RouterLink to="/products">
          <el-button type="primary" class="accent-btn" size="large">VIEW THE ARCHIVE</el-button>
        </RouterLink>
      </div>
    </section>

    <!-- Shop by species -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Shop by Species</h2>
        <p class="section-label">Select Category</p>
      </div>

      <div class="species-grid">
        <RouterLink v-for="s in speciesList" :key="s.key" to="/products" class="species-card">
          <div class="species-image">
            <img :src="s.image" :alt="s.label" />
          </div>
          <h3 class="species-title">{{ s.label }}</h3>
          <span class="species-link">Browse Collection</span>
        </RouterLink>
      </div>
    </section>

    <!-- Current selection -->
    <section class="section section-soft">
      <div class="selection-header">
        <p class="eyebrow">The Current Selection</p>
        <h2 class="section-title">Featured Collections</h2>
      </div>

      <div class="collection-grid">
        <div v-for="c in collections" :key="c.key" class="collection-card">
          <div class="collection-image placeholder-img"></div>
          <div class="collection-content">
            <h3>{{ c.title }}</h3>
            <p>{{ c.description }}</p>
            <RouterLink to="/products">
              <el-button class="outline-btn" size="large">EXPLORE</el-button>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.collections {
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

.outline-btn {
  background: none;
  border: 1px solid var(--color-heading);
  color: var(--color-heading);
}

.outline-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: none;
}

/* Hero */
.hero {
  position: relative;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
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
  max-width: 560px;
}

.hero-title {
  font-size: 2.5rem;
  line-height: 1.15;
  margin-bottom: 1rem;
  color: #fff;
}

.hero-copy {
  margin-bottom: 1.5rem;
  color: #fff;
}

/* Shop by species */
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid var(--color-border);
}

.section-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
}

.species-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.species-card {
  display: block;
  text-decoration: none;
  color: var(--color-text);
}

.species-image {
  aspect-ratio: 4 / 3;
  margin-bottom: 0.9rem;
  overflow: hidden;
  border: 1px solid transparent;
  transition: border-color 0.15s ease;
}

.species-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.species-image:hover {
  border-color: var(--color-accent);
}

.species-image:hover .species-title {
  color: var(--color-accent);
}

.species-title {
  font-size: 1.15rem;
  margin-bottom: 0.15rem;
  color: var(--color-heading);
}

.species-link {
  font-size: 0.8125rem;
  letter-spacing: 0.03em;
  text-decoration: underline;
  color: var(--color-accent);
}

/* Current selection */
.selection-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.collection-card {
  display: flex;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.collection-image {
  width: 40%;
  flex-shrink: 0;
}

.collection-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
}

.collection-content h3 {
  font-size: 1.35rem;
  color: var(--color-heading);
}

.collection-content p {
  color: var(--color-text);
  opacity: 0.85;
  flex: 1;
}

@media (max-width: 900px) {
  .species-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .collection-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .species-grid {
    grid-template-columns: 1fr;
  }

  .collection-card {
    flex-direction: column;
  }

  .collection-image {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}
</style>
