<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PhCheckCircle, PhClockCountdown, PhSealWarning } from '@phosphor-icons/vue'

const route = useRoute()

const storeName = computed(() => (route.query.store as string) || 'PawMart')
const amount = computed(() => (route.query.amount as string) || '0.00')

type Status = 'pending' | 'confirmed' | 'expired'

const status = ref<Status>('pending')
const secondsLeft = ref(60)
let timer: ReturnType<typeof setInterval> | undefined

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function confirmPayment() {
  if (status.value !== 'pending') return
  status.value = 'confirmed'
  stopTimer()
}

onMounted(() => {
  timer = setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      stopTimer()
      if (status.value === 'pending') {
        status.value = 'expired'
        // Best-effort — most browsers ignore this unless the tab was opened
        // by a script, but a phone's camera-scan tab sometimes qualifies.
        window.close()
      }
    }
  }, 1000)
})

onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="khqr-confirm-page">
    <div class="khqr-confirm-card">
      <div class="khqr-confirm-brand">KHQR</div>

      <template v-if="status === 'pending'">
        <p class="khqr-confirm-store">{{ storeName }}</p>
        <p class="khqr-confirm-amount">${{ amount }}</p>

        <p class="khqr-confirm-timer">
          <PhClockCountdown :size="16" />
          Expires in {{ secondsLeft }}s
        </p>

        <button type="button" class="khqr-confirm-btn" @click="confirmPayment">
          Confirm Payment
        </button>
        <p class="khqr-confirm-note">
          Simulated payment screen — confirms you authorized this transfer from your banking app.
        </p>
      </template>

      <template v-else-if="status === 'confirmed'">
        <PhCheckCircle :size="56" class="khqr-confirm-icon is-success" weight="fill" />
        <h1 class="khqr-confirm-title">Payment Confirmed</h1>
        <p class="khqr-confirm-store">{{ storeName }}</p>
        <p class="khqr-confirm-amount">${{ amount }}</p>
        <p class="khqr-confirm-note">You can close this page and return to your checkout.</p>
      </template>

      <template v-else>
        <PhSealWarning :size="56" class="khqr-confirm-icon is-expired" weight="fill" />
        <h1 class="khqr-confirm-title">Session Expired</h1>
        <p class="khqr-confirm-note">
          No payment was confirmed in time. Please scan the code again.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.khqr-confirm-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--color-background-soft);
}

.khqr-confirm-card {
  width: 100%;
  max-width: 320px;
  padding: 2.5rem 1.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  text-align: center;
}

.khqr-confirm-brand {
  display: inline-block;
  margin-bottom: 1.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: #e21a1a;
}

.khqr-confirm-store {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
}

.khqr-confirm-amount {
  margin: 0 0 1.25rem;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 2rem;
  color: var(--color-heading);
}

.khqr-confirm-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0 0 1.5rem;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
}

.khqr-confirm-btn {
  width: 100%;
  padding: 0.85rem;
  margin-bottom: 1rem;
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.khqr-confirm-btn:hover {
  background: var(--color-accent-dark);
}

.khqr-confirm-note {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.khqr-confirm-icon {
  margin-bottom: 1rem;
}

.khqr-confirm-icon.is-success {
  color: #2f9e44;
}

.khqr-confirm-icon.is-expired {
  color: #c92a2a;
}

.khqr-confirm-title {
  margin: 0 0 0.75rem;
}
</style>
