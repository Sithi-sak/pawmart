<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhCaretLeft, PhTruck } from '@phosphor-icons/vue'
import { useAuthStore } from '../stores/auth'
import { fetchOrders, type OrderSummary, type OrderStatus } from '../lib/orders'

const auth = useAuthStore()

const orders = ref<OrderSummary[]>([])
const loading = ref(true)
const loadError = ref(false)

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipping: 'Shipping',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

onMounted(async () => {
  await auth.init()
  if (!auth.session) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    orders.value = await fetchOrders(auth.session.access_token)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
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

    <div v-if="loading" class="order-list">
      <div v-for="n in 4" :key="n" class="order-card">
        <el-skeleton animated style="display: contents">
          <template #template>
            <el-skeleton-item variant="image" class="order-thumb" />
            <div class="order-info">
              <el-skeleton-item variant="text" class="sk-order-name" />
              <el-skeleton-item variant="text" class="sk-order-meta" />
            </div>
            <el-skeleton-item variant="text" class="sk-order-price" />
            <el-skeleton-item variant="button" class="sk-track-btn" />
          </template>
        </el-skeleton>
      </div>
    </div>
    <div v-else-if="loadError" class="state-message">
      We couldn't load your orders. Try again later.
    </div>
    <div v-else-if="orders.length === 0" class="state-message">
      <p>You haven't placed any orders yet.</p>
      <RouterLink to="/products" class="view-all-link">Browse Products</RouterLink>
    </div>

    <div v-else class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-thumb placeholder-img"></div>

        <div class="order-info">
          <p class="order-name">Order #{{ order.order_number }}</p>
          <p class="order-meta">
            {{ order.item_count }} {{ order.item_count === 1 ? 'ITEM' : 'ITEMS' }} &bull;
            {{ STATUS_LABELS[order.status].toUpperCase() }} &bull;
            {{ formatDate(order.created_at).toUpperCase() }}
          </p>
        </div>

        <p class="order-price">{{ formatPrice(order.total) }}</p>

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
  height: auto;
}

.sk-order-name {
  width: 70%;
  margin-bottom: 0.4rem;
}

.sk-order-meta {
  width: 90%;
}

.sk-order-price {
  width: 3.5rem;
}

.sk-track-btn {
  width: 8rem;
  height: 2.6rem;
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
