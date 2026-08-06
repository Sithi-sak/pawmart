<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhTruck, PhLock, PhMinus, PhPlus } from '@phosphor-icons/vue'

interface CartItem {
  id: number
  productId: number
  name: string
  variant: string
  size: string
  price: number
  quantity: number
}

const items = ref<CartItem[]>([
  {
    id: 1,
    productId: 3,
    name: 'Woven Leather Leash Set',
    variant: 'COGNAC / ITALIAN LEATHER',
    size: 'Medium',
    price: 210.0,
    quantity: 1,
  },
  {
    id: 2,
    productId: 5,
    name: 'Grooming Brush Kit',
    variant: 'NATURAL BOAR BRISTLE',
    size: 'Standard',
    price: 125.0,
    quantity: 2,
  },
])

interface RelatedProduct {
  id: number
  category: string
  name: string
  price: number
}

const relatedProducts: RelatedProduct[] = [
  { id: 1, category: 'Bedding', name: 'Plush Nest Bed', price: 345.0 },
  { id: 6, category: 'Food & Nutrition', name: 'Gourmet Chicken & Wild Salmon', price: 45.0 },
  { id: 13, category: 'Grooming Kit', name: 'Nail Trimmer & File Set', price: 28.0 },
  { id: 4, category: 'Toys', name: 'Sisal Scratch Post', price: 540.0 },
]

const router = useRouter()

const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

// Mock promo codes — real validation/discount lookup comes with the checkout API (3.2).
const voucherCodes: Record<string, number> = {
  PAWMART10: 0.1,
  WELCOME15: 0.15,
}

const voucherInput = ref('')
const appliedVoucher = ref<{ code: string; rate: number } | null>(null)
const voucherError = ref(false)

const discount = computed(() =>
  appliedVoucher.value ? subtotal.value * appliedVoucher.value.rate : 0,
)

const total = computed(() => subtotal.value - discount.value)

function applyVoucher() {
  const code = voucherInput.value.trim().toUpperCase()
  if (!code) return

  const rate = voucherCodes[code]
  if (rate) {
    appliedVoucher.value = { code, rate }
    voucherError.value = false
  } else {
    appliedVoucher.value = null
    voucherError.value = true
  }
}

function removeVoucher() {
  appliedVoucher.value = null
  voucherInput.value = ''
  voucherError.value = false
}

function increment(item: CartItem) {
  item.quantity++
}

function decrement(item: CartItem) {
  if (item.quantity > 1) item.quantity--
}

function removeItem(id: number) {
  items.value = items.value.filter((item) => item.id !== id)
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function proceedToCheckout() {
  router.push('/checkout')
}
</script>

<template>
  <div class="cart">
    <div class="cart-header">
      <h1 class="page-title">Your Cart</h1>
      <p class="items-count">
        {{ itemCount }} {{ itemCount === 1 ? 'Item' : 'Items' }} in your selection
      </p>
    </div>
    <div class="header-divider"></div>

    <div v-if="items.length" class="cart-body">
      <div class="line-items">
        <div v-for="item in items" :key="item.id" class="line-item">
          <RouterLink :to="`/products/${item.productId}`" class="item-image placeholder-img" />

          <div class="item-details">
            <RouterLink :to="`/products/${item.productId}`" class="item-name">{{
              item.name
            }}</RouterLink>
            <p class="item-variant">{{ item.variant }}</p>
            <p class="item-size">Size: {{ item.size }}</p>

            <div class="qty-stepper">
              <button type="button" class="qty-btn" @click="decrement(item)">
                <PhMinus :size="12" />
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button type="button" class="qty-btn" @click="increment(item)">
                <PhPlus :size="12" />
              </button>
            </div>
          </div>

          <div class="item-aside">
            <p class="item-price">{{ formatPrice(item.price) }}</p>
            <button type="button" class="remove-link" @click="removeItem(item.id)">Remove</button>
          </div>
        </div>
      </div>

      <aside class="order-summary">
        <h2 class="summary-title">Order Summary</h2>
        <div class="summary-divider"></div>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </div>
        <div class="summary-row">
          <span>Shipping</span>
          <span class="complimentary">Complimentary</span>
        </div>
        <div v-if="appliedVoucher" class="summary-row discount-row">
          <span>Discount ({{ appliedVoucher.code }})</span>
          <span>-{{ formatPrice(discount) }}</span>
        </div>

        <div class="summary-divider"></div>

        <div class="voucher-group">
          <div class="voucher-row">
            <input
              v-model="voucherInput"
              type="text"
              placeholder="Promo code"
              class="voucher-input"
              :disabled="!!appliedVoucher"
              @keyup.enter="applyVoucher"
            />
            <button
              v-if="!appliedVoucher"
              type="button"
              class="voucher-btn"
              @click="applyVoucher"
            >
              Apply
            </button>
            <button v-else type="button" class="voucher-btn" @click="removeVoucher">Remove</button>
          </div>
          <p v-if="voucherError" class="voucher-message is-error">Invalid promo code</p>
          <p v-else-if="appliedVoucher" class="voucher-message is-success">
            "{{ appliedVoucher.code }}" applied — {{ Math.round(appliedVoucher.rate * 100) }}% off
          </p>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row total-row">
          <span>Total</span>
          <span>{{ formatPrice(total) }}</span>
        </div>

        <button type="button" class="checkout-btn" @click="proceedToCheckout">
          Proceed to Checkout
        </button>

        <ul class="summary-perks">
          <li>
            <PhTruck :size="18" />
            <span>Carbon neutral shipping worldwide</span>
          </li>
          <li>
            <PhLock :size="18" />
            <span>Secure checkout &amp; data encryption</span>
          </li>
        </ul>
      </aside>
    </div>

    <div v-else class="empty-cart">
      <p>Your cart is empty.</p>
      <RouterLink to="/products" class="shop-link">Shop All</RouterLink>
    </div>

    <section class="related">
      <div class="related-header">
        <h2 class="section-title">Complete the Look</h2>
        <RouterLink to="/products" class="view-all-link">View All Essentials</RouterLink>
      </div>

      <div class="related-grid">
        <RouterLink
          v-for="p in relatedProducts"
          :key="p.id"
          :to="`/products/${p.id}`"
          class="related-card"
        >
          <div class="related-image placeholder-img"></div>
          <div class="related-info">
            <h3 class="related-name">{{ p.name }}</h3>
            <p class="related-price">{{ formatPrice(p.price) }}</p>
          </div>
        </RouterLink>
      </div>
    </section>
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

.cart {
  padding: 1rem 0 3rem;
}

.cart-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.page-title {
  font-size: 2.5rem;
}

.items-count {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

.header-divider {
  height: 1px;
  background: var(--color-ink);
  margin-bottom: 2.5rem;
}

/* Body layout */
.cart-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 3rem;
  align-items: start;
  margin-bottom: 4rem;
}

.line-items {
  display: flex;
  flex-direction: column;
}

.line-item {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 1.5rem;
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.line-item:first-child {
  padding-top: 0;
}

.item-image {
  display: block;
  aspect-ratio: 1 / 1;
}

.item-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.item-name {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  color: var(--color-heading);
  text-decoration: none;
  margin-bottom: 0.35rem;
}

.item-variant {
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.5rem;
}

.item-size {
  font-size: 0.85rem;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.qty-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
}

.qty-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
}

.qty-btn:hover {
  color: var(--color-accent);
}

.qty-value {
  min-width: 2rem;
  text-align: center;
  font-size: 0.9rem;
}

.item-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  text-align: right;
}

.item-price {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-heading);
}

.remove-link {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: underline;
  color: var(--color-text);
  cursor: pointer;
}

.remove-link:hover {
  color: var(--color-accent);
}

/* Order summary */
.order-summary {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 1.75rem;
}

.summary-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.summary-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 1rem;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.85rem;
}

.complimentary {
  color: var(--color-accent);
  font-weight: 600;
  letter-spacing: 0.03em;
}

.discount-row span:last-child {
  color: var(--color-accent);
}

.voucher-group {
  margin-bottom: 1rem;
}

.voucher-row {
  display: flex;
}

.voucher-input {
  flex: 1;
  min-width: 0;
  height: 2.5rem;
  padding: 0 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-right: none;
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.85rem;
}

.voucher-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.voucher-input:disabled {
  opacity: 0.6;
}

.voucher-btn {
  height: 2.5rem;
  padding: 0 1.1rem;
  background: var(--color-ink);
  border: 1px solid var(--color-ink);
  color: #fff;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
}

.voucher-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.voucher-message {
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.voucher-message.is-error {
  color: #c0392b;
}

.voucher-message.is-success {
  color: var(--color-accent);
}

.total-row {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.total-row span:last-child {
  color: var(--color-accent);
}

.checkout-btn {
  display: block;
  width: 100%;
  height: 3rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.5rem;
}

.checkout-btn:hover {
  background: var(--color-accent-dark);
}

.summary-perks {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.summary-perks li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Empty state */
.empty-cart {
  padding: 4rem 0;
  text-align: center;
  margin-bottom: 4rem;
}

.empty-cart p {
  opacity: 0.6;
  margin-bottom: 1rem;
}

.shop-link {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  background: var(--color-accent);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.shop-link:hover {
  background: var(--color-accent-dark);
}

/* Related */
.related-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  font-size: 1.85rem;
}

.view-all-link {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-decoration: underline;
  color: var(--color-text);
  white-space: nowrap;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.related-card {
  display: block;
  text-decoration: none;
  color: var(--color-text);
}

.related-image {
  aspect-ratio: 1 / 1;
  margin-bottom: 0.9rem;
}

.related-name {
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  color: var(--color-heading);
}

.related-price {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.75;
}

@media (max-width: 900px) {
  .cart-body {
    grid-template-columns: 1fr;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .line-item {
    grid-template-columns: 100px 1fr;
  }

  .item-aside {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
