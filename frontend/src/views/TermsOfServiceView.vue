<script setup lang="ts">
const obligations: string[] = [
  'All registration information you submit will be true, accurate, current, and complete.',
  'You will maintain the security of your account and take full responsibility for any activity that occurs under it.',
  'Your use of PAWMART will not violate any applicable law or regulation.',
  'You will respect the intellectual integrity of our architectural designs and curated editorial content.',
]
</script>

<template>
  <div class="terms">
    <!-- Hero -->
    <section class="hero section-soft">
      <p class="eyebrow">Legal Governance</p>
      <h1 class="hero-title">Terms of Service</h1>
      <p class="hero-copy">
        The agreement between you and PAWMART that governs access to our digital boutique, editorial
        content, and bespoke architectural services.
      </p>
      <div class="hero-divider"></div>
    </section>

    <!-- Legal sections -->
    <section class="legal">
      <div class="legal-section">
        <div class="legal-number">01</div>
        <div class="legal-body">
          <h2>Acceptance of Terms</h2>
          <p>
            These Terms of Service constitute a legally binding agreement made between you, whether
            personally or on behalf of an entity, and PAWMART, concerning your access to and use of
            our digital platforms, editorial content, and bespoke architectural services.
          </p>
          <p>
            By accessing PAWMART, you signify that you have read, understood, and agree to be bound
            by all of these terms. If you do not agree with all of these terms, then you are
            expressly prohibited from using our services and must discontinue use immediately.
          </p>
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-number">02</div>
        <div class="legal-body">
          <h2>User Obligations</h2>
          <p>As a member of the PAWMART community, you represent and warrant that:</p>
          <ul class="obligation-list">
            <li v-for="o in obligations" :key="o">{{ o }}</li>
          </ul>
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-number">03</div>
        <div class="legal-body">
          <h2>Intellectual Property</h2>
          <p>
            Unless otherwise indicated, the Site and Services are our proprietary property and all
            source code, databases, functionality, software, website designs, audio, video, text,
            photographs, and graphics on the Site (collectively, the "Content") and the trademarks,
            service marks, and logos contained therein (the "Marks") are owned or controlled by us
            or licensed to us.
          </p>
          <p>
            The Content and Marks are provided on the Site "AS IS" for your information and personal
            use only. No part of the Site and no Content or Marks may be copied, reproduced,
            aggregated, republished, uploaded, posted, or distributed for any commercial purpose
            whatsoever without our express prior written permission.
          </p>
        </div>
      </div>

      <div class="legal-section">
        <div class="legal-number">04</div>
        <div class="legal-body">
          <h2>Limitation of Liability</h2>
          <p>
            In no event will we or our directors, employees, or agents be liable to you or any third
            party for any direct, indirect, consequential, exemplary, incidental, special, or
            punitive damages, including lost profit, lost revenue, loss of data, or other damages
            arising from your use of our architectural products or digital services.
          </p>
          <p>
            Notwithstanding anything to the contrary contained herein, our liability to you for any
            cause whatsoever and regardless of the form of the action, will at all times be limited
            to the amount paid, if any, by you to us during the six (6) month period prior to any
            cause of action arising.
          </p>
        </div>
      </div>

      <div class="legal-section legal-section--last">
        <div class="legal-number">05</div>
        <div class="legal-body">
          <h2>Governing Law</h2>
          <p>
            These Terms shall be governed by and defined following the laws of the jurisdiction in
            which PAWMART is headquartered. You irrevocably consent that the courts of said
            jurisdiction shall have exclusive jurisdiction to resolve any dispute which may arise in
            connection with these terms.
          </p>
        </div>
      </div>

      <div class="legal-meta">
        <div>
          <p class="meta-updated">LAST UPDATED: OCTOBER 24, 2023</p>
          <p class="meta-tagline">Questions about these terms? We're glad to walk through them.</p>
        </div>
        <el-button type="primary" class="accent-btn" size="large">CONTACT LEGAL</el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.terms {
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
  width: 2px;
  height: 3rem;
  background: var(--color-accent);
  margin: 2rem auto 0;
}

/* Legal sections */
.legal {
  max-width: 780px;
  margin: 0 auto;
  padding: 3.5rem 0 2.5rem;
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

.obligation-list {
  list-style: none;
  padding-left: 1.25rem;
  border-left: 2px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-text);
}

/* Meta */
.legal-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.meta-updated {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 0.3rem;
}

.meta-tagline {
  font-style: italic;
  color: var(--color-text);
}

@media (max-width: 700px) {
  .legal-section {
    grid-template-columns: 1fr;
  }

  .legal-number {
    display: none;
  }

  .legal-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
