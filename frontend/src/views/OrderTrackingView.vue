<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhCheck, PhArchive, PhTruck, PhMapPin, PhPackage, PhHeadset } from '@phosphor-icons/vue'
import { useAuthStore } from '../stores/auth'
import { fetchOrder, type Order, type OrderStatus } from '../lib/orders'

const props = defineProps<{ id: string }>()
const auth = useAuthStore()

const order = ref<Order | null>(null)
const loading = ref(true)
const loadError = ref(false)

interface StepDef {
  key: OrderStatus
  label: string
  icon: typeof PhCheck
}

const STEP_DEFS: StepDef[] = [
  { key: 'confirmed', label: 'Confirmed', icon: PhCheck },
  { key: 'processing', label: 'Processing', icon: PhArchive },
  { key: 'shipping', label: 'Shipping', icon: PhTruck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: PhMapPin },
  { key: 'delivered', label: 'Delivered', icon: PhPackage },
]

const currentStepIndex = computed(() =>
  order.value ? STEP_DEFS.findIndex((s) => s.key === order.value!.status) : -1,
)

const historyDateByStatus = computed(() => {
  const map = new Map<OrderStatus, string>()
  for (const entry of order.value?.status_history ?? []) {
    map.set(entry.status, entry.created_at)
  }
  return map
})

const steps = computed(() =>
  STEP_DEFS.map((step) => ({
    ...step,
    date: historyDateByStatus.value.get(step.key) ?? null,
  })),
)

const SHIPPING_METHOD_LABELS = { standard: 'Standard Shipping', express: 'Express Shipping' }
const ETA_DAYS_FROM_ORDER = { standard: [3, 5], express: [1, 2] } as const

const estimatedArrival = computed(() => {
  if (!order.value) return ''
  if (order.value.status === 'delivered') return 'Delivered'

  const [minDays, maxDays] = ETA_DAYS_FROM_ORDER[order.value.shipping_method]
  const created = new Date(order.value.created_at)
  const start = new Date(created)
  start.setDate(start.getDate() + minDays)
  const end = new Date(created)
  end.setDate(end.getDate() + maxDays)

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
})

function formatStepDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

onMounted(async () => {
  await auth.init()
  const orderId = Number(props.id)

  if (!orderId || !auth.session) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    order.value = await fetchOrder(orderId, auth.session.access_token)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="tracking">
    <div v-if="loading" class="state-message">Loading your order…</div>

    <div v-else-if="loadError || !order" class="state-message">
      <p>We couldn't find that order.</p>
      <RouterLink to="/account/orders" class="view-all-link">View Order History</RouterLink>
    </div>

    <template v-else>
      <div class="tracking-header">
        <div>
          <p class="eyebrow">Order Status</p>
          <h1 class="tracking-title">Track Order</h1>
        </div>
        <div class="order-number-card">
          <p class="order-number-label">Order Number</p>
          <p class="order-number-value">#{{ order.order_number }}</p>
        </div>
      </div>

      <p v-if="order.payment_status === 'pending_confirmation'" class="pending-note">
        Payment pending confirmation — we'll notify you once it's verified.
      </p>

      <div class="header-divider"></div>

      <div class="timeline">
        <template v-for="(step, i) in steps" :key="step.key">
          <div class="timeline-step" :class="{ 'is-done': i <= currentStepIndex }">
            <div class="step-icon">
              <component :is="step.icon" :size="18" weight="bold" />
            </div>
            <div class="step-text">
              <p class="step-label">{{ step.label }}</p>
              <p v-if="step.date" class="step-date">{{ formatStepDate(step.date) }}</p>
            </div>
          </div>
          <div
            v-if="i < steps.length - 1"
            class="timeline-connector"
            :class="{ 'is-done': i < currentStepIndex }"
          ></div>
        </template>
      </div>

      <div class="tracking-body">
        <div class="delivery-card">
          <h2 class="card-title">Delivery Information</h2>
          <div class="card-divider"></div>

          <p class="field-label">Estimated Arrival</p>
          <p class="field-highlight">{{ estimatedArrival }}</p>

          <p class="field-label">Shipping Address</p>
          <p class="field-value">{{ order.shipping_full_name }}</p>
          <p class="field-value">
            {{ order.shipping_street }}, {{ order.shipping_city }} {{ order.shipping_postal_code }}
          </p>

          <p class="field-label">Shipping Method</p>
          <p class="field-value">{{ SHIPPING_METHOD_LABELS[order.shipping_method] }}</p>

          <button type="button" class="contact-btn">
            Contact
            <PhHeadset :size="18" />
          </button>
        </div>

        <div class="items-card">
          <div class="items-header">
            <h2 class="card-title">Order Details</h2>
            <span class="items-count">{{ order.items.length }} Items</span>
          </div>
          <div class="card-divider"></div>

          <div class="order-items">
            <div v-for="item in order.items" :key="item.id" class="order-item">
              <div class="order-item-image placeholder-img"></div>
              <div class="order-item-details">
                <p class="order-item-name">{{ item.name }}</p>
                <p v-if="item.variant" class="order-item-variant">{{ item.variant }}</p>
                <div class="order-item-meta">
                  <span class="qty-badge">QTY: {{ item.quantity }}</span>
                  <span v-if="item.sku" class="sku-badge">SKU: {{ item.sku }}</span>
                </div>
              </div>
              <p class="order-item-price">{{ formatPrice(item.price * item.quantity) }}</p>
            </div>
          </div>

          <div class="totals-divider"></div>

          <div class="totals-row">
            <span>Subtotal</span>
            <span>{{ formatPrice(order.subtotal) }}</span>
          </div>
          <div class="totals-row">
            <span>Shipping</span>
            <span>{{ order.shipping_cost ? formatPrice(order.shipping_cost) : 'Complimentary' }}</span>
          </div>
          <div v-if="order.discount" class="totals-row">
            <span>Discount</span>
            <span>-{{ formatPrice(order.discount) }}</span>
          </div>
          <div class="totals-row">
            <span>Tax</span>
            <span>{{ formatPrice(order.tax) }}</span>
          </div>

          <div class="card-divider"></div>

          <div class="totals-row total-row">
            <span>Total</span>
            <span>{{ formatPrice(order.total) }}</span>
          </div>
        </div>
      </div>
    </template>
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

.tracking {
  padding: 1rem 0 5rem;
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

.tracking-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.25rem;
}

.eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.tracking-title {
  font-size: 2.75rem;
}

.order-number-card {
  flex-shrink: 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 1rem 1.5rem;
}

.order-number-label {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 0.3rem;
}

.order-number-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
}

.pending-note {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  margin-bottom: 1.5rem;
}

.header-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 3rem;
}

/* Timeline */
.timeline {
  display: flex;
  align-items: flex-start;
  margin-bottom: 3.5rem;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  opacity: 0.5;
}

.timeline-step.is-done .step-icon {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  opacity: 1;
}

.step-label {
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
}

.timeline-step.is-done .step-label {
  color: var(--color-heading);
  font-weight: 600;
}

.step-date {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
  white-space: nowrap;
}

.timeline-connector {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  margin: 1.35rem 0.5rem 0;
}

.timeline-connector.is-done {
  background: var(--color-accent);
}

/* Body */
.tracking-body {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 2rem;
  align-items: start;
}

.delivery-card,
.items-card {
  border: 1px solid var(--color-border);
  padding: 1.75rem;
}

.delivery-card {
  background: var(--color-background-soft);
}

.card-title {
  font-size: 1.1rem;
}

.card-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1rem 0 1.25rem;
}

.field-label {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 1.1rem;
  margin-bottom: 0.35rem;
}

.field-label:first-of-type {
  margin-top: 0;
}

.field-highlight {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 0.2rem;
}

.field-value {
  font-size: 0.9rem;
  color: var(--color-text);
}

.contact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 2.9rem;
  margin-top: 1.5rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 500;
  cursor: pointer;
}

.contact-btn:hover {
  background: var(--color-accent-dark);
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.items-count {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.order-item {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 1.25rem;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.order-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.order-item-image {
  aspect-ratio: 1 / 1;
}

.order-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.35rem;
}

.order-item-variant {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 0.75rem;
}

.order-item-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.qty-badge {
  display: inline-flex;
  align-items: center;
  height: 1.6rem;
  padding: 0 0.6rem;
  background: var(--color-ink);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.sku-badge {
  display: inline-flex;
  align-items: center;
  height: 1.6rem;
  padding: 0 0.6rem;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.7rem;
  letter-spacing: 0.03em;
}

.order-item-price {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.totals-divider {
  height: 2px;
  background: var(--color-heading);
  margin-bottom: 1.1rem;
}

.totals-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.total-row {
  font-family: var(--font-sans);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0;
}

.total-row span:last-child {
  color: var(--color-accent);
}

/* Mobile: stack header, collapse timeline to a vertical list (closer to
   how Shopee/Lazada-style tracking reads on a phone), single-column body. */
@media (max-width: 700px) {
  .tracking-header {
    flex-direction: column;
  }

  .tracking-title {
    font-size: 2.1rem;
  }

  .header-divider {
    margin-bottom: 2rem;
  }

  .timeline {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 2.5rem;
  }

  .timeline-step {
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 1rem;
  }

  .step-text {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .timeline-connector {
    width: 1px;
    height: 1.5rem;
    flex: none;
    margin: 0.15rem 0 0.15rem 1.375rem;
  }

  .tracking-body {
    grid-template-columns: 1fr;
  }

  .delivery-card,
  .items-card {
    padding: 1.25rem;
  }

  .order-item {
    grid-template-columns: 64px 1fr;
    grid-template-areas:
      'image details'
      'image price';
  }

  .order-item-image {
    grid-area: image;
  }

  .order-item-details {
    grid-area: details;
  }

  .order-item-price {
    grid-area: price;
  }
}
</style>
