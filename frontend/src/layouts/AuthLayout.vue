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
    grid-template-rows: auto 1fr;
  }

  /* Short image banner instead of hiding the visual entirely -- it carries
     the only link home, which an installed PWA has no browser chrome for. */
  .auth-visual {
    height: calc(150px + env(safe-area-inset-top, 0px));
  }

  .auth-brand {
    top: calc(1.25rem + env(safe-area-inset-top, 0px));
    left: 1.25rem;
  }

  .auth-panel {
    justify-content: flex-start;
    padding: 2rem 1.25rem calc(2rem + env(safe-area-inset-bottom, 0px));
  }
}
</style>
