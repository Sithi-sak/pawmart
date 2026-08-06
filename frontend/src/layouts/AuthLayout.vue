<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="auth-shell">
    <div class="auth-visual placeholder-img">
      <RouterLink to="/" class="auth-brand">PAWMART</RouterLink>
    </div>
    <div class="auth-panel">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.placeholder-img {
  background: linear-gradient(165deg, #9a9a9a 0%, #d8d8d8 100%);
}

@media (prefers-color-scheme: dark) {
  .placeholder-img {
    background: linear-gradient(165deg, #4a4a4a 0%, #2c2c2c 100%);
  }
}

.auth-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.auth-visual {
  position: relative;
}

.auth-brand {
  position: absolute;
  top: 2rem;
  left: 2rem;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #fff;
  text-decoration: none;
}

.auth-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem 4rem;
  background: var(--color-background);
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    display: none;
  }

  .auth-panel {
    padding: 2.5rem 1.5rem;
  }
}
</style>
