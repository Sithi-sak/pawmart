<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
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
      <RouterLink to="/store/manage" class="brand">🐾 PawMart Seller</RouterLink>
      <nav class="admin-nav">
        <RouterLink to="/store/manage">Dashboard</RouterLink>
        <RouterLink to="/store/manage/products">Products</RouterLink>
        <RouterLink to="/store/manage/orders">Orders</RouterLink>
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
  min-height: 0;
  padding: 1.5rem;
  overflow-y: auto;
}
</style>
