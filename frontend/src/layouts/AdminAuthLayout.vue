<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="admin-auth-shell">
    <RouterLink to="/" class="admin-auth-brand">PAWMART</RouterLink>
    <div class="admin-auth-panel">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.admin-auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: var(--color-background);
}

.admin-auth-brand {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-heading);
  text-decoration: none;
  margin-bottom: 2.5rem;
}

.admin-auth-panel {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
