<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  PhCaretLeft,
  PhGearSix,
  PhHeart,
  PhHouse,
  PhMagnifyingGlass,
  PhShoppingCart,
  PhStorefront,
  PhUser,
} from '@phosphor-icons/vue'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import logoUrl from '@/assets/logo.svg'

const cart = useCartStore()
const wishlist = useWishlistStore()
const route = useRoute()
const router = useRouter()

// Mobile bottom tab bar. `match` decides which tab lights up for nested pages
// (e.g. a product detail page still counts as "Shop").
const tabs = [
  { to: '/', label: 'Home', icon: PhHouse, match: (p: string) => p === '/' },
  {
    to: '/products',
    label: 'Shop',
    icon: PhStorefront,
    match: (p: string) =>
      p.startsWith('/products') || p.startsWith('/collections') || p.startsWith('/store/'),
  },
  { to: '/wishlist', label: 'Wishlist', icon: PhHeart, match: (p: string) => p === '/wishlist' },
  {
    to: '/cart',
    label: 'Cart',
    icon: PhShoppingCart,
    match: (p: string) => p === '/cart' || p === '/checkout' || p.startsWith('/order'),
  },
  {
    to: '/account',
    label: 'Account',
    icon: PhUser,
    match: (p: string) => p.startsWith('/account'),
  },
]

function tabBadge(to: string) {
  if (to === '/cart') return cart.itemCount
  if (to === '/wishlist') return wishlist.itemCount
  return 0
}

// Tab roots show the logo; anything deeper gets an app-style back button.
const isTabRoot = computed(() => tabs.some((t) => t.to === route.path))

// The app-bar search shortcut is hidden on the Shop/Wishlist/Cart/Account tabs
// (Shop has its own search bar), on Settings, and during checkout, where it's
// a distraction.
const showSearch = computed(
  () =>
    (!isTabRoot.value || route.path === '/') &&
    route.name !== 'settings' &&
    route.path !== '/checkout' &&
    !route.path.startsWith('/order/'),
)

function goBack() {
  // history.state.back is set by vue-router when there's an in-app page to
  // return to; a deep link opened fresh has none, so fall back to home.
  if (window.history.state?.back) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="site">
    <header class="site-header">
      <div class="header-inner">
        <button
          v-if="!isTabRoot"
          type="button"
          class="back-btn"
          aria-label="Go back"
          @click="goBack"
        >
          <PhCaretLeft :size="22" />
        </button>

        <RouterLink to="/" class="brand">
          <img :src="logoUrl" alt="" class="brand-logo" />
          PAWMART
        </RouterLink>

        <nav class="nav-links">
          <RouterLink to="/" active-class="">Home</RouterLink>
          <RouterLink to="/products">Shop All</RouterLink>
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/about">About Us</RouterLink>
        </nav>

        <div class="nav-actions">
          <RouterLink to="/wishlist" class="icon-link">
            <el-badge :value="wishlist.itemCount" :hidden="wishlist.itemCount === 0" :max="99">
              <PhHeart :size="20" />
            </el-badge>
          </RouterLink>
          <RouterLink to="/cart" class="icon-link">
            <el-badge :value="cart.itemCount" :hidden="cart.itemCount === 0" :max="99">
              <PhShoppingCart :size="20" />
            </el-badge>
          </RouterLink>
          <RouterLink to="/account" class="icon-link">
            <PhUser :size="20" />
          </RouterLink>
        </div>

        <RouterLink
          v-if="route.path === '/account'"
          to="/account/settings"
          class="app-bar-action"
          aria-label="Settings"
        >
          <PhGearSix :size="22" />
        </RouterLink>
        <RouterLink
          v-else-if="showSearch"
          to="/products"
          class="app-bar-action"
          aria-label="Search products"
        >
          <PhMagnifyingGlass :size="22" />
        </RouterLink>
      </div>
    </header>

    <main class="site-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <div class="footer-newsletter">
        <h2>Stay in the Loop</h2>
        <p>
          Get new arrivals, seasonal collections, and pet-care tips delivered straight to your
          inbox.
        </p>
        <div class="newsletter-form">
          <el-input placeholder="Your email address" size="large" />
          <el-button type="primary" class="accent-btn" size="large">Subscribe</el-button>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-brand">
          <p class="brand">PAWMART</p>
          <p class="copyright">
            &copy; {{ new Date().getFullYear() }} PawMart. All rights reserved.
          </p>
        </div>

        <nav class="footer-links">
          <RouterLink to="/privacy">Privacy</RouterLink>
          <RouterLink to="/terms">Terms</RouterLink>
          <RouterLink to="/about">About Us</RouterLink>
          <RouterLink to="/sell">Become a Seller</RouterLink>
          <RouterLink to="/">Contact</RouterLink>
        </nav>
      </div>
    </footer>

    <nav class="tab-bar" aria-label="Primary">
      <RouterLink
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="tab"
        :class="{ 'is-active': t.match(route.path) }"
      >
        <el-badge :value="tabBadge(t.to)" :hidden="!tabBadge(t.to)" :max="99">
          <component :is="t.icon" :size="24" :weight="t.match(route.path) ? 'fill' : 'regular'" />
        </el-badge>
        <span class="tab-label">{{ t.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Guard against any stray wide element causing sideways page scroll on
     phones. clip (unlike hidden) doesn't break the sticky header. */
  overflow-x: clip;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: var(--content-max-width);
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

.site-header .brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-logo {
  width: 2rem;
  height: 2rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
  flex: 1;
  justify-content: center;
}

.nav-links a {
  position: relative;
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-bottom: 0.35rem;
}

.nav-links a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}

.nav-links a:hover {
  color: var(--color-accent);
}

.nav-links a:hover::after {
  transform: scaleX(1);
}

.nav-links a.router-link-exact-active {
  color: var(--color-accent);
}

.nav-links a.router-link-exact-active::after {
  transform: scaleX(1);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.icon-link {
  display: flex;
  align-items: center;
  color: var(--color-text);
}

.icon-link :deep(.el-badge) {
  display: flex;
  align-items: center;
}

.icon-link :deep(.el-badge__content) {
  top: 2px;
  right: 2px;
}

.site-main {
  flex: 1;
  max-width: var(--content-max-width);
  width: 100%;
  margin: 0 auto;
  padding: var(--page-gutter);
}

:deep(.page-enter-active) {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

:deep(.page-enter-from) {
  opacity: 0;
  transform: translateY(16px);
}

:deep(.page-leave-active) {
  transition: opacity 0.15s ease;
}

:deep(.page-leave-to) {
  opacity: 0;
}

/* Footer */
.site-footer {
  background: var(--color-ink);
  color: #fff;
}

.footer-newsletter {
  max-width: var(--content-max-width);
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
  max-width: var(--content-max-width);
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

.back-btn,
.app-bar-action,
.tab-bar {
  display: none;
}

@media (max-width: 768px) {
  /* Fade only: a transform on the entering page would make the views' own
     position: fixed bars (cart checkout, add-to-cart) anchor to the page
     instead of the screen until the transition ends. */
  :deep(.page-enter-from) {
    transform: none;
  }

  .site {
    /* Keep the last bit of content (the footer) clear of the fixed tab bar. */
    padding-bottom: calc(var(--tab-bar-height) + var(--safe-bottom));
  }

  .site-header {
    padding-top: env(safe-area-inset-top, 0px);
  }

  .header-inner {
    gap: 0.25rem;
    height: var(--app-bar-height);
    padding: 0 0.5rem 0 var(--page-gutter);
  }

  /* Back button's own hit area already supplies the left padding. */
  .header-inner:has(.back-btn) {
    padding-left: 0.25rem;
  }

  .brand {
    font-size: 1.15rem;
  }

  .brand-logo {
    width: 1.6rem;
    height: 1.6rem;
  }

  .nav-links,
  .nav-actions {
    display: none;
  }

  .back-btn,
  .app-bar-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    background: none;
    border: none;
    color: var(--color-heading);
    cursor: pointer;
  }

  .app-bar-action {
    margin-left: auto;
  }

  /* App-style shell: the tab bar replaces the website footer on phones. */
  .site-footer {
    display: none;
  }

  .tab-bar {
    position: fixed;
    z-index: 20;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    height: calc(var(--tab-bar-height) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
  }

  /* Out of the way while typing instead of riding up on the keyboard
     (see lib/keyboard.ts). */
  :global(html.keyboard-open) .tab-bar {
    display: none;
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    color: var(--color-text);
    opacity: 0.6;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .tab.is-active {
    color: var(--color-accent);
    opacity: 1;
  }

  .tab :deep(.el-badge) {
    display: flex;
  }

  .tab :deep(.el-badge__content) {
    top: 2px;
    right: 4px;
  }

  .tab-label {
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.03em;
  }
}
</style>
