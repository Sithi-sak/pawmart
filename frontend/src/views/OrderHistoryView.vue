<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PhCaretLeft, PhTruck } from '@phosphor-icons/vue'

interface Order {
  id: number
  name: string
  status: string
  date: string
  price: number
}

const orders: Order[] = [
  { id: 1, name: 'The Signature Collar', status: 'Delivered', date: 'Oct 12, 2025', price: 245 },
  { id: 2, name: 'Matte Ceramic Bowl', status: 'Shipped', date: 'Oct 08, 2025', price: 85 },
  { id: 3, name: 'Cashmere Pet Throw', status: 'Delivered', date: 'Sep 24, 2025', price: 420 },
  {
    id: 4,
    name: 'Architectural Ceramic Bowl',
    status: 'Delivered',
    date: 'Aug 30, 2025',
    price: 180,
  },
  { id: 5, name: 'Plush Nest Bed', status: 'Delivered', date: 'Aug 02, 2025', price: 345 },
  { id: 6, name: 'Sisal Scratch Post', status: 'Delivered', date: 'Jul 19, 2025', price: 540 },
  {
    id: 7,
    name: 'Gourmet Chicken & Wild Salmon',
    status: 'Delivered',
    date: 'Jun 27, 2025',
    price: 45,
  },
]

function orderNumber(id: number) {
  return `#PM-${id.toString().padStart(6, '0')}`
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <div class="order-history">
    <RouterLink to="/account" class="back-link">
      <PhCaretLeft :size="14" />
      Back to Account
    </RouterLink>

    <div class="page-header">
      <h1 class="page-title">Order History</h1>
      <p class="page-subtitle">
        {{ orders.length }} {{ orders.length === 1 ? 'Order' : 'Orders' }}
      </p>
    </div>

    <div class="header-divider"></div>

    <div class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-thumb placeholder-img"></div>

        <div class="order-info">
          <p class="order-name">{{ order.name }}</p>
          <p class="order-meta">
            {{ orderNumber(order.id) }} &bull; {{ order.status.toUpperCase() }} &bull;
            {{ order.date.toUpperCase() }}
          </p>
        </div>

        <p class="order-price">{{ formatPrice(order.price) }}</p>

        <RouterLink :to="`/orders/${order.id}`" class="track-btn">
          <PhTruck :size="16" />
          Track Order
        </RouterLink>
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

.order-history {
  padding: 1rem 0 4rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.7;
  text-decoration: none;
  margin-bottom: 1.5rem;
}

.back-link:hover {
  opacity: 1;
  color: var(--color-accent);
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2.5rem;
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

.header-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 2rem;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  display: grid;
  grid-template-columns: 72px 1fr auto auto;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
}

.order-thumb {
  aspect-ratio: 1 / 1;
}

.order-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.3rem;
}

.order-meta {
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.6;
}

.order-price {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.track-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 2.6rem;
  padding: 0 1.1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.track-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (max-width: 700px) {
  .order-card {
    grid-template-columns: 56px 1fr;
    grid-template-areas:
      'thumb info'
      'thumb price'
      'action action';
    row-gap: 0.5rem;
  }

  .order-thumb {
    grid-area: thumb;
  }

  .order-info {
    grid-area: info;
  }

  .order-price {
    grid-area: price;
  }

  .track-btn {
    grid-area: action;
    width: 100%;
  }
}
</style>
