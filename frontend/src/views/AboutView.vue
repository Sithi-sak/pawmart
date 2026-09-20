<script setup lang="ts">
import { RouterLink } from 'vue-router'
import aboutCover from '@/assets/images/about_cover.jpg'
import craftImage from '@/assets/images/ad-3.jpg'
import commitmentImageA from '@/assets/images/ad-1.jpg'
import commitmentImageB from '@/assets/images/ad-2.jpg'

interface Feature {
  title: string
  description: string
}

const features: Feature[] = [
  {
    title: 'Durable, Easy-Clean Ceramics',
    description:
      'Feeding pieces finished for daily washing and years of use, without ever looking clinical.',
  },
  {
    title: 'Comfort-Tested Textiles & Leather',
    description:
      'Bedding and accessories upholstered in materials chosen for softness, resilience, and safety against wear.',
  },
  {
    title: 'Non-Toxic, Safe-Finish Hardwoods',
    description:
      'Furniture built from solid, sustainably-sourced wood, finished with pet-safe sealants throughout.',
  },
]
</script>

<template>
  <div class="about">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-media" :style="{ backgroundImage: `url(${aboutCover})` }"></div>
      <div class="hero-card">
        <h1 class="hero-title">Where Design Meets Devotion.</h1>
        <p class="hero-copy">
          PawMart began with a simple conviction: the objects that shape a pet's daily life deserve
          the same care as anything else in a well-considered home.
        </p>
        <RouterLink to="/products">
          <el-button type="primary" class="accent-btn" size="large">SHOP FOR WELLBEING</el-button>
        </RouterLink>
      </div>
    </section>

    <!-- Our commitment -->
    <section class="section commitment">
      <div class="commitment-content">
        <p class="eyebrow">Our Commitment</p>
        <h2 class="section-title">Considered Design, Considered Care</h2>
        <p>
          Every piece in our collection is selected, or made, with a single question in mind: does
          this genuinely improve a pet's daily life? We work with artisans and manufacturers who
          share our standards for material integrity, safety, and craftsmanship.
        </p>
        <p>
          The result is a catalogue that looks at home in a considered interior, and holds up to the
          realities of muddy paws, chew sessions, and everyday companionship.
        </p>
      </div>
      <div class="commitment-media">
        <div class="img-a" :style="{ backgroundImage: `url(${commitmentImageA})` }"></div>
        <div class="img-b" :style="{ backgroundImage: `url(${commitmentImageB})` }"></div>
      </div>
    </section>

    <!-- Built for real life -->
    <section class="section section-soft">
      <div class="craft">
        <div class="craft-frame">
          <div class="craft-image" :style="{ backgroundImage: `url(${craftImage})` }"></div>
        </div>
        <div class="craft-content">
          <h2 class="craft-title">Built for Real Life</h2>
          <ul class="feature-list">
            <li v-for="f in features" :key="f.title">
              <h4>{{ f.title.toUpperCase() }}</h4>
              <p>{{ f.description }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- The studio -->
    <section class="section studio">
      <div class="studio-header">
        <p class="eyebrow">The Studio</p>
        <h2 class="section-title">The People Behind the Practice</h2>
      </div>

      <div class="studio-grid">
        <div class="studio-founder">
          <h3>Chea Bunthay</h3>
          <p class="founder-role">Founder &amp; Creative Director</p>
          <p class="founder-bio">
            Bunthay founded PawMart after years of searching for pet furniture that matched the rest
            of his home, and finding nothing that did. He now leads design and sourcing for every
            collection.
          </p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to furnish a life well-loved?</h2>
      <RouterLink to="/products">
        <el-button type="primary" class="accent-btn" size="large">SHOP WELLBEING</el-button>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.about {
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
  font-size: 1.85rem;
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.accent-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.accent-btn:hover {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

/* Hero */
.hero {
  position: relative;
  margin: -1.5rem calc(-1 * 1.5rem) 0;
  padding-bottom: 4rem;
}

.hero-media {
  height: 440px;
  background-size: cover;
  background-position: center;
}

.hero-card {
  position: absolute;
  top: 100px;
  left: 3rem;
  width: 360px;
  max-width: calc(100% - 4.5rem);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 2.25rem;
}

.hero-title {
  font-size: 2rem;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.hero-copy {
  color: var(--color-text);
  margin-bottom: 1.5rem;
}

/* Our commitment */
.commitment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.commitment-content p {
  color: var(--color-text);
  margin-top: 1rem;
}

.commitment-media {
  display: flex;
  gap: 1.5rem;
}

.commitment-media .img-a,
.commitment-media .img-b {
  background-size: cover;
  background-position: center;
}

.commitment-media .img-a {
  width: 55%;
  aspect-ratio: 4 / 5;
}

.commitment-media .img-b {
  width: 45%;
  aspect-ratio: 3 / 5;
  margin-top: 2.5rem;
}

/* Built for real life */
.craft {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.craft-frame {
  border: 1px solid var(--color-border);
  padding: 6px;
}

.craft-image {
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
}

.craft-title {
  font-size: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--color-accent);
  margin-bottom: 1.75rem;
}

.feature-list {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-list h4 {
  font-size: 1rem;
  letter-spacing: 0.05em;
  color: var(--color-heading);
  margin-bottom: 0.4rem;
}

.feature-list p {
  color: var(--color-text);
  opacity: 0.85;
  font-size: 0.9rem;
}

/* Studio */
.studio-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.studio-grid {
  display: flex;
  justify-content: center;
}

.studio-founder {
  width: 100%;
  max-width: 420px;
}

.founder-image {
  aspect-ratio: 1 / 1;
  margin-bottom: 1rem;
}

.studio-founder h3 {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  color: var(--color-heading);
}

.founder-role {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin: 0.35rem 0 0.9rem;
}

.founder-bio {
  color: var(--color-text);
  opacity: 0.85;
  font-size: 0.9rem;
}

/* CTA */
.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 2.5rem 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.cta h2 {
  font-size: 1.5rem;
}

@media (max-width: 900px) {
  .hero-card {
    position: static;
    width: auto;
    margin: -3rem 1.5rem 0;
  }

  .hero-media {
    height: 320px;
  }

  .hero {
    padding-bottom: 2.5rem;
  }

  .commitment,
  .craft {
    grid-template-columns: 1fr;
  }

  .cta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
