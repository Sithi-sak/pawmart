<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCartStore } from '../stores/cart'
import type { CartItem } from '../stores/cart'

const cart = useCartStore()

// Snapshot the cart before clearing it, so this confirmation still has
// something to show once the order is placed and the cart resets.
const orderItems = ref<CartItem[]>([])
const orderSubtotal = ref(0)
const orderTotal = ref(0)
const orderNumber = ref('')

const arrivalRange = ref('')

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function formatArrivalDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

onMounted(() => {
  orderItems.value = cart.items.map((item) => ({ ...item }))
  orderSubtotal.value = cart.subtotal
  orderTotal.value = cart.total
  orderNumber.value = `#PM-${Math.floor(100000 + Math.random() * 900000)}`

  const start = new Date()
  start.setDate(start.getDate() + 3)
  const end = new Date()
  end.setDate(end.getDate() + 5)
  arrivalRange.value = `${formatArrivalDate(start)} — ${formatArrivalDate(end)}, ${end.getFullYear()}`

  cart.clear()
})
</script>

<template>
  <div class="confirmation">
    <div class="confirmation-header">
      <h1 class="confirmation-title">Thank You for Choosing Excellence</h1>
      <p class="order-number">Order Confirmed: {{ orderNumber }}</p>
    </div>

    <div class="confirmation-body">
      <div class="confirmation-image placeholder-img"></div>

      <div class="confirmation-details">
        <div class="order-summary">
          <h2 class="summary-title">Order Summary</h2>
          <div class="summary-divider"></div>

          <div class="summary-items">
            <div v-for="item in orderItems" :key="item.id" class="summary-item">
              <div class="summary-item-info">
                <p class="summary-item-name">{{ item.name.toUpperCase() }}</p>
                <p class="summary-item-variant">{{ item.variant }} / {{ item.size }}</p>
              </div>
              <p class="summary-item-price">{{ formatPrice(item.price * item.quantity) }}</p>
            </div>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-row">
            <span>Subtotal</span>
            <span>{{ formatPrice(orderSubtotal) }}</span>
          </div>
          <div class="summary-row">
            <span>Shipping</span>
            <span>{{ formatPrice(0) }}</span>
          </div>

          <div class="summary-row total-row">
            <span>Total</span>
            <span>{{ formatPrice(orderTotal) }}</span>
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
  </div>
</template>

<style scoped>
.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

@media (prefers-color-scheme: dark) {
  .placeholder-img {
    background: linear-gradient(180deg, #4a4a4a 0%, #2c2c2c 100%);
  }
}

.confirmation {
  padding: 2rem 0 5rem;
}

.confirmation-header {
  text-align: center;
  margin-bottom: 3rem;
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
