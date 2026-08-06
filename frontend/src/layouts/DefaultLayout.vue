<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { PhShoppingCart, PhUser, PhShareNetwork, PhLink, PhEnvelope } from '@phosphor-icons/vue'
</script>

<template>
  <div class="site">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink to="/" class="brand">PAWMART</RouterLink>

        <nav class="nav-links">
          <RouterLink to="/products">Shop All</RouterLink>
          <RouterLink to="/collections">Collections</RouterLink>
        </nav>

        <div class="nav-actions">
          <RouterLink to="/cart" class="icon-link">
            <PhShoppingCart :size="20" />
          </RouterLink>
          <RouterLink to="/account" class="icon-link">
            <PhUser :size="20" />
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="footer-newsletter">
        <h2>Stay in the Loop</h2>
        <p>New arrivals, seasonal collections, and pet-care tips — straight to your inbox.</p>
        <div class="newsletter-form">
          <el-input placeholder="Your email address" size="large" />
          <el-button type="primary" class="accent-btn" size="large">Subscribe</el-button>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-brand">
          <p class="brand">PAWMART</p>
          <p class="copyright">&copy; {{ new Date().getFullYear() }} PawMart. All rights reserved.</p>
        </div>

        <nav class="footer-links">
          <RouterLink to="/">Privacy</RouterLink>
          <RouterLink to="/">Terms</RouterLink>
          <RouterLink to="/">About Us</RouterLink>
          <RouterLink to="/">Contact</RouterLink>
        </nav>

        <div class="footer-social">
          <PhShareNetwork :size="18" />
          <PhLink :size="18" />
          <PhEnvelope :size="18" />
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.site-header {
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}

.brand {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-heading);
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.75rem;
  flex: 1;
  justify-content: center;
}

.nav-links a {
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid transparent;
}

.nav-links a.router-link-exact-active,
.nav-links a.router-link-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-link {
  display: flex;
  color: var(--color-text);
}

.site-main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Footer */
.site-footer {
  background: var(--color-ink);
  color: #fff;
}

.footer-newsletter {
  max-width: 1280px;
  margin: 0 auto;
  text-align: center;
  padding: 3.5rem 1.5rem 2.5rem;
}

.footer-newsletter h2 {
  color: #fff;
  margin-bottom: 0.5rem;
}

.footer-newsletter p {
  opacity: 0.75;
  margin-bottom: 1.5rem;
}

.newsletter-form {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  max-width: 420px;
  margin: 0 auto;
}

.accent-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.accent-btn:hover {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

.footer-bottom {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem 1.5rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.footer-brand .brand {
  color: #fff;
  font-size: 1.1rem;
}

.footer-brand .copyright {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 0.15rem;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-links a {
  color: #fff;
  opacity: 0.75;
  text-decoration: none;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.footer-links a:hover {
  opacity: 1;
}

.footer-social {
  display: flex;
  gap: 0.9rem;
  color: #fff;
}

@media (max-width: 700px) {
  .header-inner {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .nav-links {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }

  .newsletter-form {
    flex-direction: column;
  }
}
</style>
