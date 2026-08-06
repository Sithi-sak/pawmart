<script setup lang="ts">
import { computed } from 'vue'
import { PhCheck, PhArchive, PhTruck, PhMapPin, PhPackage, PhHeadset } from '@phosphor-icons/vue'

const props = defineProps<{ id: string }>()

interface TrackingStep {
  key: string
  label: string
  date: string | null
  icon: typeof PhCheck
}

// Mock tracking data — real status lookup by order id lands with task 3.3.
const orderNumber = computed(() => `#PM-${props.id.padStart(6, '0')}`)

const steps: TrackingStep[] = [
  { key: 'placed', label: 'Order Placed', date: 'Oct 12, 10:30 AM', icon: PhCheck },
  { key: 'confirmed', label: 'Confirmed', date: 'Oct 12, 11:15 AM', icon: PhCheck },
  { key: 'processing', label: 'Processing', date: 'Oct 13, 09:00 AM', icon: PhArchive },
  { key: 'shipped', label: 'Shipped', date: null, icon: PhTruck },
  { key: 'out_for_delivery', label: 'Out for Delivery', date: null, icon: PhMapPin },
  { key: 'delivered', label: 'Delivered', date: null, icon: PhPackage },
]

const currentStepIndex = 2

interface OrderItem {
  id: number
  name: string
  variant: string
  price: number
  quantity: number
  sku: string
}

const orderItems: OrderItem[] = [
  {
    id: 1,
    name: 'Sienna Artisan Leather Collar',
    variant: 'Color: Cognac / Hardware: Polished Brass / Size: Medium',
    price: 245.0,
    quantity: 1,
    sku: 'PM-LTC-09',
  },
  {
    id: 2,
    name: 'Architectural Ceramic Bowl',
    variant: 'Finish: Matte Charcoal / Material: High-fire Stoneware',
    price: 180.0,
    quantity: 1,
    sku: 'PM-ACB-42',
  },
]

const subtotal = computed(() => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0))
const shipping = 0
const estimatedTax = computed(() => subtotal.value * 0.085)
const total = computed(() => subtotal.value + shipping + estimatedTax.value)

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <div class="tracking">
    <div class="tracking-header">
      <div>
        <p class="eyebrow">Order Status</p>
        <h1 class="tracking-title">Track Order</h1>
      </div>
      <div class="order-number-card">
        <p class="order-number-label">Order Number</p>
        <p class="order-number-value">{{ orderNumber }}</p>
      </div>
    </div>

    <div class="header-divider"></div>

    <div class="timeline">
      <template v-for="(step, i) in steps" :key="step.key">
        <div class="timeline-step" :class="{ 'is-done': i <= currentStepIndex }">
          <div class="step-icon">
            <component :is="step.icon" :size="18" weight="bold" />
          </div>
          <p class="step-label">{{ step.label }}</p>
          <p v-if="step.date" class="step-date">{{ step.date }}</p>
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
        <p class="field-highlight">Thursday, October 17</p>
        <p class="field-value">Between 9:00 AM - 5:00 PM</p>

        <p class="field-label">Shipping Address</p>
        <p class="field-value">BKK, Daun Penh St. 4</p>

        <p class="field-label">Carrier</p>
        <p class="field-value">PawMart Logistics</p>
        <p class="field-value tracking-link">Tracking: LLX-9921-001</p>

        <button type="button" class="contact-btn">
          Contact
          <PhHeadset :size="18" />
        </button>
      </div>

      <div class="items-card">
        <div class="items-header">
          <h2 class="card-title">Order Details</h2>
          <span class="items-count">{{ orderItems.length }} Items</span>
        </div>
        <div class="card-divider"></div>

        <div class="order-items">
          <div v-for="item in orderItems" :key="item.id" class="order-item">
            <div class="order-item-image placeholder-img"></div>
            <div class="order-item-details">
              <p class="order-item-name">{{ item.name }}</p>
              <p class="order-item-variant">{{ item.variant }}</p>
              <div class="order-item-meta">
                <span class="qty-badge">QTY: {{ item.quantity }}</span>
                <span class="sku-badge">SKU: {{ item.sku }}</span>
              </div>
            </div>
            <p class="order-item-price">{{ formatPrice(item.price * item.quantity) }}</p>
          </div>
        </div>

        <div class="totals-divider"></div>

        <div class="totals-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </div>
        <div class="totals-row">
          <span>Shipping (Complimentary)</span>
          <span>{{ formatPrice(shipping) }}</span>
        </div>
        <div class="totals-row">
          <span>Estimated Tax</span>
          <span>{{ formatPrice(estimatedTax) }}</span>
        </div>

        <div class="card-divider"></div>

        <div class="totals-row total-row">
          <span>Total</span>
          <span>{{ formatPrice(total) }}</span>
        </div>
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

.tracking {
  padding: 1rem 0 5rem;
}

.tracking-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
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

.tracking-link {
  text-decoration: underline;
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

@media (max-width: 900px) {
  .tracking-header {
    flex-direction: column;
  }

  .timeline {
    flex-wrap: wrap;
    gap: 1.5rem 0;
  }

  .timeline-connector {
    display: none;
  }

  .timeline-step {
    width: 33%;
  }

  .tracking-body {
    grid-template-columns: 1fr;
  }
}
</style>
