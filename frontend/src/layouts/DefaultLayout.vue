<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ShoppingCart, User } from '@element-plus/icons-vue'
</script>

<template>
  <div class="site">
    <header class="site-header">
      <RouterLink to="/" class="brand">🐾 PawMart</RouterLink>

      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/products">Products</RouterLink>
      </nav>

      <div class="nav-actions">
        <RouterLink to="/cart" class="icon-link">
          <el-icon :size="20"><ShoppingCart /></el-icon>
        </RouterLink>
        <RouterLink to="/account" class="icon-link">
          <el-icon :size="20"><User /></el-icon>
        </RouterLink>
        <RouterLink to="/login">
          <el-button size="small">Log In</el-button>
        </RouterLink>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <p>&copy; {{ new Date().getFullYear() }} PawMart. All rights reserved.</p>
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
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  flex: 1;
}

.nav-links a {
  color: var(--color-text);
  text-decoration: none;
}

.nav-links a.router-link-exact-active {
  color: var(--el-color-primary);
  font-weight: 600;
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

.site-footer {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text);
  border-top: 1px solid var(--color-border);
}
</style>