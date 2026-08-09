<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Otherwise session/customer state only loads when navigating to a route
// that requires auth, leaving pages like /cart unaware a session exists.
useAuthStore().init()
</script>

<template>
  <RouterView />
</template>