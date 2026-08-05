<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink to="/admin" class="brand">🐾 PawMart Admin</RouterLink>
      <nav class="admin-nav">
        <RouterLink to="/admin">Dashboard</RouterLink>
        <RouterLink to="/admin/products">Products</RouterLink>
        <RouterLink to="/admin/orders">Orders</RouterLink>
      </nav>
      <RouterLink to="/" class="back-link">&larr; Back to store</RouterLink>
    </aside>

    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--color-border);
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
}

.admin-main {
  flex: 1;
  padding: 1.5rem;
}
</style>
