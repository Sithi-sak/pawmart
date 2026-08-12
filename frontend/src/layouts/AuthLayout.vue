<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import authCover from '@/assets/images/auth_cover.jpg'
import authSignin from '@/assets/images/auth_signin.jpg'
import authSignup from '@/assets/images/auth_signup.jpg'

const route = useRoute()

const visualImage = computed(() => {
  if (route.name === 'login') return authSignin
  if (route.name === 'signup') return authSignup
  return authCover
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-visual" :style="{ backgroundImage: `url(${visualImage})` }">
      <RouterLink to="/" class="auth-brand">PAWMART</RouterLink>
    </div>
    <div class="auth-panel">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.auth-visual {
  position: relative;
  background-size: cover;
  background-position: center;
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
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
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
