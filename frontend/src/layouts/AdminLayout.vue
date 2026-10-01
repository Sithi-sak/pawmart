<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { PhCalendarBlank, PhSquaresFour, PhStorefront, PhUserPlus } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function handleSignOut() {
  await auth.signOut()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink to="/admin" class="brand">🐾 PawMart Admin</RouterLink>
      <nav class="admin-nav">
        <RouterLink to="/admin">
          <PhSquaresFour :size="22" class="nav-icon" />Dashboard
        </RouterLink>
        <RouterLink to="/admin/stores">
          <PhStorefront :size="22" class="nav-icon" />Stores
        </RouterLink>
        <RouterLink to="/admin/store-requests">
          <PhUserPlus :size="22" class="nav-icon" />Seller Requests
        </RouterLink>
        <RouterLink to="/admin/upcoming-stores">
          <PhCalendarBlank :size="22" class="nav-icon" />Upcoming Stores
        </RouterLink>
      </nav>
      <button type="button" class="back-link" @click="handleSignOut">Sign Out</button>
    </aside>

    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.brand {
  font-weight: 700;
  color: var(--color-heading);
  text-decoration: none;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.admin-nav a {
  color: var(--color-text);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.admin-nav a.router-link-exact-active {
  background: var(--color-background-soft, rgba(64, 158, 255, 0.1));
  color: var(--el-color-primary);
  font-weight: 600;
}

.back-link {
  font-size: 0.85rem;
  color: var(--color-text);
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.back-link:hover {
  color: var(--color-accent);
}

.admin-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 1.5rem;
  overflow-y: auto;
}

.nav-icon {
  display: none;
}

@media (max-width: 768px) {
  /* Sidebar -> slim top bar (brand + sign out); nav -> bottom tab bar. */
  .admin-shell {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .admin-sidebar {
    position: sticky;
    top: 0;
    z-index: 10;
    width: auto;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    height: calc(var(--app-bar-height) + env(safe-area-inset-top, 0px));
    padding: env(safe-area-inset-top, 0px) var(--page-gutter) 0;
    background: var(--color-background);
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    overflow: visible;
  }

  .admin-nav {
    position: fixed;
    z-index: 20;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    height: calc(var(--tab-bar-height) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
  }

  .admin-nav a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    padding: 0 0.25rem;
    font-size: 0.65rem;
    font-weight: 500;
    text-align: center;
    line-height: 1.2;
    opacity: 0.6;
  }

  .admin-nav a.router-link-exact-active {
    background: none;
    opacity: 1;
  }

  .nav-icon {
    display: block;
  }

  .admin-main {
    overflow: visible;
    padding: var(--page-gutter) var(--page-gutter)
      calc(var(--tab-bar-height) + var(--safe-bottom) + 1.5rem);
  }
}
</style>
