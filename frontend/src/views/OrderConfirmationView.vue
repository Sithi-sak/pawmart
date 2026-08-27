<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { fetchOrder, type Order } from '../lib/orders'
import { POINTS_PER_DOLLAR } from '../lib/loyalty'
import thankYouCover from '../assets/images/thank_you_cover.jpg'

const route = useRoute()
const auth = useAuthStore()

const order = ref<Order | null>(null)
const loading = ref(true)
const loadError = ref(false)
const arrivalRange = ref('')

const pointsEarned = computed(() => {
  if (!order.value || order.value.payment_status !== 'paid') return 0
  return Math.floor((order.value.subtotal - order.value.discount) * POINTS_PER_DOLLAR)
})

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function formatArrivalDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

onMounted(async () => {
  await auth.init()
  const orderId = Number(route.query.orderId)

  if (!orderId || !auth.session) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    order.value = await fetchOrder(orderId, auth.session.access_token)

    const created = new Date(order.value.created_at)
    const start = new Date(created)
    start.setDate(start.getDate() + 3)
    const end = new Date(created)
    end.setDate(end.getDate() + 5)
    arrivalRange.value = `${formatArrivalDate(start)} — ${formatArrivalDate(end)}, ${end.getFullYear()}`
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="confirmation">
    <div v-if="loading" class="state-message">Loading your order…</div>

    <div v-else-if="loadError || !order" class="state-message">
      <p>We couldn't find that order.</p>
      <RouterLink to="/account/orders" class="view-all-link">View Order History</RouterLink>
    </div>

    <template v-else>
      <div class="confirmation-header">
        <h1 class="confirmation-title">Thank You for Choosing Excellence</h1>
        <p class="order-number">Order Confirmed: #{{ order.order_number }}</p>
        <p v-if="order.payment_status === 'pending_confirmation'" class="pending-note">
          Payment pending confirmation — we'll notify you once it's verified.
        </p>
        <p v-else-if="pointsEarned > 0" class="pending-note">
          You earned {{ pointsEarned.toLocaleString('en-US') }} Paws Rewards points on this order.
        </p>
      </div>

      <div class="confirmation-body">
        <div class="confirmation-image" :style="{ backgroundImage: `url(${thankYouCover})` }"></div>

        <div class="confirmation-details">
          <div class="order-summary">
            <h2 class="summary-title">Order Summary</h2>
            <div class="summary-divider"></div>

            <div class="summary-items">
              <div v-for="item in order.items" :key="item.id" class="summary-item">
                <div class="summary-item-info">
                  <p class="summary-item-name">{{ item.name.toUpperCase() }}</p>
                  <p class="summary-item-variant">Qty: {{ item.quantity }}</p>
                </div>
                <p class="summary-item-price">{{ formatPrice(item.price * item.quantity) }}</p>
              </div>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ formatPrice(order.subtotal) }}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span>{{ formatPrice(order.shipping_cost) }}</span>
            </div>
            <div v-if="order.discount" class="summary-row">
              <span>Discount</span>
              <span>-{{ formatPrice(order.discount) }}</span>
            </div>
            <div class="summary-row">
              <span>Tax</span>
              <span>{{ formatPrice(order.tax) }}</span>
            </div>

            <div class="summary-row total-row">
              <span>Total</span>
              <span>{{ formatPrice(order.total) }}</span>
            </div>
          </div>

          <div class="delivery-details">
            <h2 class="delivery-title">Delivery Details</h2>
            <div class="delivery-divider"></div>

            <p class="arrival-estimate">Estimated Arrival: {{ arrivalRange }}</p>
            <p class="arrival-note">
              A member of our care team will call ahead 24 hours before delivery.
            </p>
          </div>

          <RouterLink to="/collections" class="return-btn">Return to Collections</RouterLink>
          <RouterLink to="/account" class="profile-btn">View Your Profile</RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.confirmation {
  padding: 2rem 0 5rem;
}

.state-message {
  padding: 4rem 0;
  text-align: center;
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.view-all-link {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-decoration: underline;
  color: var(--color-text);
}

.confirmation-header {
  text-align: center;
  margin-bottom: 3rem;
}

.pending-note {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
}

.confirmation-title {
  font-size: 2.75rem;
  margin-bottom: 0.75rem;
}

.order-number {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-accent);
}

.confirmation-body {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 3rem;
  align-items: start;
}

.confirmation-image {
  aspect-ratio: 4 / 3;
  background-size: cover;
  background-position: center;
}

.confirmation-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.order-summary {
  border: 1px solid var(--color-border);
  padding: 1.75rem;
}

.summary-title {
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.summary-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 1rem;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.summary-item-name {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.summary-item-variant {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
}

.summary-item-price {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.75;
  margin-bottom: 0.6rem;
}

.total-row {
  font-family: var(--font-sans);
  font-size: 1.15rem;
  letter-spacing: normal;
  text-transform: none;
  color: var(--color-heading);
  opacity: 1;
  margin-top: 0.6rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--color-border);
}

.delivery-details {
  padding-top: 0.5rem;
}

.delivery-title {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

.delivery-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 1rem;
}

.arrival-estimate {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.arrival-note {
  font-size: 0.85rem;
  font-style: italic;
  color: var(--color-text);
  opacity: 0.7;
}

.return-btn,
.profile-btn {
  display: block;
  text-align: center;
  height: 3rem;
  line-height: 3rem;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  text-decoration: none;
}

.return-btn {
  background: var(--color-accent);
  color: #fff;
}

.return-btn:hover {
  background: var(--color-accent-dark);
}

.profile-btn {
  background: var(--color-background);
  border: 1px solid var(--color-heading);
  color: var(--color-heading);
}

.profile-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (max-width: 900px) {
  .confirmation-body {
    grid-template-columns: 1fr;
  }
}
</style>
