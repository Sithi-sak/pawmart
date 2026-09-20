<script setup lang="ts">
interface RightCard {
  title: string
  description: string
}

const rights: RightCard[] = [
  {
    title: 'Access & Portability',
    description:
      'Request a comprehensive transcript of all personal data we hold in a structured format.',
  },
  {
    title: 'Rectification',
    description:
      'Correct any inaccuracies in your profile to maintain the precision of our records.',
  },
  {
    title: 'Erasure',
    description:
      "Exercise your 'right to be forgotten' and request the total removal of your data.",
  },
  {
    title: 'Restriction',
    description: 'Limit the processing of your data for specific editorial or marketing purposes.',
  },
]
</script>

<template>
  <div class="privacy">
    <!-- Hero -->
    <section class="hero section-soft">
      <p class="eyebrow">Legal Framework</p>
      <h1 class="hero-title">Privacy &amp; Policy</h1>
      <p class="hero-copy">
        Your trust is our most valued companion. We handle your data with the same precision and
        care we apply to our curated collections.
      </p>
      <div class="hero-divider"></div>
    </section>

    <!-- Legal sections -->
    <section class="legal">
      <div class="legal-section">
        <div class="legal-number">01</div>
        <div class="legal-body">
          <h2>Introduction</h2>
          <p>
            PAWMART ("we", "us", or "our") is committed to protecting the privacy of our discerning
            clientele. This Privacy Policy outlines how we collect, use, and safeguard your personal
            information through our digital boutique and editorial platforms.
          </p>
          <p>
            As an architectural pet luxury brand, we prioritize transparency and security in every
            interaction. By engaging with PAWMART, you acknowledge the practices described in this
            document.
          </p>
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-number">02</div>
        <div class="legal-body">
          <h2>Information Collection</h2>
          <p>
            We curate data as meticulously as our products. We collect information you provide
            directly to us when you:
          </p>
          <ul class="bullet-list">
            <li>Register for a boutique account</li>
            <li>Purchase architectural pet furniture or accessories</li>
            <li>Subscribe to our editorial newsletter</li>
            <li>Participate in bespoke concierge consultations</li>
          </ul>
          <p>
            This data includes identifiers such as your name, billing address, refined shipping
            preferences, and payment details processed via secure encryption.
          </p>
        </div>
      </div>

      <div class="legal-image">
        <div class="legal-image-media placeholder-img"></div>
        <div class="legal-image-caption">
          <p class="eyebrow">Handled with Care</p>
          <p>Every record is encrypted, access-limited, and reviewed on a recurring schedule.</p>
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-number">03</div>
        <div class="legal-body">
          <h2>Data Protection</h2>
          <p>
            Security is the foundation of our architecture. We implement rigorous technical and
            organizational measures to protect your personal data against unauthorized access,
            alteration, or disclosure.
          </p>
          <p>
            All sensitive transactions are handled through high-grade SSL encryption. We restrict
            access to personal information to PAWMART employees, contractors, and agents who require
            that data to provide our luxury services.
          </p>
        </div>
      </div>

      <div class="legal-section legal-section--last">
        <div class="legal-number">04</div>
        <div class="legal-body">
          <h2>Your Rights</h2>
          <p>
            As a PAWMART client, you retain absolute authority over your information. You have the
            right to:
          </p>
          <div class="rights-grid">
            <div v-for="r in rights" :key="r.title" class="rights-card">
              <h4>{{ r.title.toUpperCase() }}</h4>
              <p>{{ r.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="questions">
        <h2>Questions?</h2>
        <p>
          Our privacy team is happy to walk through any part of this policy or help with a specific
          request regarding your data.
        </p>
        <el-button type="primary" class="accent-btn" size="large">CONTACT</el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.privacy {
  display: flex;
  flex-direction: column;
}

.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.8125rem;
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
  text-align: center;
  margin: -1.5rem calc(-1 * 1.5rem) 0;
  padding: 4rem 1.5rem 3rem;
}

.hero-title {
  font-size: 2.75rem;
  margin-bottom: 1rem;
}

.hero-copy {
  max-width: 560px;
  margin: 0 auto;
  font-style: italic;
  color: var(--color-text);
}

.hero-divider {
  width: 3rem;
  height: 2px;
  background: var(--color-accent);
  margin: 2rem auto 0;
}

/* Legal sections */
.legal {
  max-width: 780px;
  margin: 0 auto;
  padding: 3.5rem 0;
}

.legal-section {
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: 1.5rem;
  padding-bottom: 2.5rem;
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--color-border);
}

.legal-section--last {
  border-bottom: none;
  margin-bottom: 0;
}

.legal-number {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--color-accent);
  opacity: 0.55;
}

.legal-body h2 {
  font-size: 1.6rem;
  margin-bottom: 1rem;
}

.legal-body p {
  color: var(--color-text);
  margin-bottom: 0.85rem;
}

.legal-body p:last-child {
  margin-bottom: 0;
}

.bullet-list {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}

.bullet-list li {
  position: relative;
  padding-left: 1.1rem;
  color: var(--color-text);
}

.bullet-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 6px;
  height: 6px;
  background: var(--color-accent);
}

/* Image block */
.legal-image {
  position: relative;
  margin-bottom: 3rem;
}

.legal-image-media {
  aspect-ratio: 16 / 7;
}

.legal-image-caption {
  position: absolute;
  left: 1.5rem;
  bottom: -2.25rem;
  width: 260px;
  max-width: calc(100% - 3rem);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 1rem 1.25rem;
}

.legal-image-caption p:last-child {
  color: var(--color-text);
  font-size: 0.9rem;
}

/* Rights */
.rights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.25rem;
}

.rights-card {
  border: 1px solid var(--color-border);
  padding: 1.25rem;
}

.rights-card h4 {
  color: var(--color-accent);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
}

.rights-card p {
  font-size: 0.9rem;
  margin-bottom: 0;
}

/* Questions */
.questions {
  text-align: center;
  background: var(--color-background-soft);
  padding: 3rem 2rem;
  margin-top: 1rem;
}

.questions h2 {
  font-size: 1.65rem;
  margin-bottom: 1rem;
}

.questions p {
  max-width: 480px;
  margin: 0 auto 1.5rem;
  color: var(--color-text);
}

@media (max-width: 700px) {
  .legal-section {
    grid-template-columns: 1fr;
  }

  .legal-number {
    display: none;
  }

  .rights-grid {
    grid-template-columns: 1fr;
  }

  .legal-image-caption {
    position: static;
    width: auto;
    margin-top: -1px;
  }
}
</style>
