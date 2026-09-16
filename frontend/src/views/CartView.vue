<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhTruck, PhLock, PhMinus, PhPlus } from '@phosphor-icons/vue'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '@/stores/auth'
import { fetchProductBySlug, type Product } from '@/lib/products'
import { fetchAvailableRedemptions, type AvailableRedemption } from '@/lib/loyalty'

const cart = useCartStore()
const auth = useAuthStore()

const RELATED_SLUGS = [
  'plush-nest-bed',
  'gourmet-chicken-wild-salmon',
  'nail-trimmer-file-set',
  'sisal-scratch-post',
]

const relatedProducts = ref<Product[]>([])

onMounted(async () => {
  try {
    const products = await Promise.all(RELATED_SLUGS.map(fetchProductBySlug))
    relatedProducts.value = products.filter((p): p is Product => p !== null)
  } catch {
    // Non-critical: the "You Might Also Like" section just stays empty.
  }
})

const router = useRouter()

const availableRedemptions = ref<AvailableRedemption[]>([])
const redemptionsLoading = ref(false)
const redemptionsError = ref(false)
const selectedRedemptionId = ref<number | null>(null)

async function loadAvailableRedemptions(customerId: string | undefined) {
  if (!customerId) {
    availableRedemptions.value = []
    redemptionsError.value = false
    return
  }
  redemptionsLoading.value = true
  redemptionsError.value = false
  try {
    availableRedemptions.value = await fetchAvailableRedemptions()
  } catch {
    redemptionsError.value = true
  } finally {
    redemptionsLoading.value = false
  }
}

watch(() => auth.customer?.id, loadAvailableRedemptions, { immediate: true })

function rewardLabel(reward: AvailableRedemption['reward']) {
  if (reward.free_shipping) return reward.title
  return `${reward.title} — $${reward.discount_amount?.toFixed(2)} off`
}

function applyRedemption(redemptionId: number | null) {
  if (redemptionId == null) return
  const redemption = availableRedemptions.value.find((r) => r.id === redemptionId)
  if (redemption) cart.applyRedemption(redemption)
}

function removeRedemption() {
  cart.removeRedemption()
  selectedRedemptionId.value = null
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
        {{ cart.itemCount }} {{ cart.itemCount === 1 ? 'Item' : 'Items' }} in your selection
      </p>
    </div>
    <div class="header-divider"></div>

    <div v-if="cart.loading" class="cart-body">
      <div class="line-items">
        <div v-for="n in 3" :key="n" class="line-item">
          <el-skeleton animated style="display: contents">
            <template #template>
              <el-skeleton-item variant="image" class="item-image" />
              <div class="item-details">
                <el-skeleton-item variant="text" class="sk-item-name" />
                <el-skeleton-item variant="text" class="sk-item-variant" />
                <el-skeleton-item variant="button" class="sk-qty-stepper" />
              </div>
              <el-skeleton-item variant="text" class="sk-item-price" />
            </template>
          </el-skeleton>
        </div>
      </div>

      <aside class="order-summary">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="h3" class="sk-summary-title" />
            <el-skeleton-item variant="text" class="sk-summary-row" />
            <el-skeleton-item variant="text" class="sk-summary-row" />
            <el-skeleton-item variant="text" class="sk-summary-row" />
            <el-skeleton-item variant="button" class="sk-checkout-btn" />
          </template>
        </el-skeleton>
      </aside>
    </div>

    <div v-else-if="cart.items.length" class="cart-body">
      <div class="line-items">
        <div v-for="item in cart.items" :key="item.productId" class="line-item">
          <RouterLink
            :to="`/products/${item.slug}`"
            class="item-image"
            :class="{ 'placeholder-img': !item.image }"
            :style="item.image ? { backgroundImage: `url(${item.image})` } : undefined"
          />

          <div class="item-details">
            <RouterLink :to="`/products/${item.slug}`" class="item-name">{{
              item.name
            }}</RouterLink>
            <p v-if="item.brand" class="item-variant">{{ item.brand.toUpperCase() }}</p>

            <div class="qty-stepper">
              <button type="button" class="qty-btn" @click="cart.decrement(item)">
                <PhMinus :size="12" />
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button type="button" class="qty-btn" @click="cart.increment(item)">
                <PhPlus :size="12" />
              </button>
            </div>
          </div>

          <div class="item-aside">
            <p class="item-price">{{ formatPrice(item.price) }}</p>
            <button type="button" class="remove-link" @click="cart.removeItem(item.productId)">
              Remove
            </button>
          </div>
        </div>
      </div>

      <aside class="order-summary">
        <h2 class="summary-title">Order Summary</h2>
        <div class="summary-divider"></div>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(cart.subtotal) }}</span>
        </div>
        <div class="summary-row">
          <span>Shipping</span>
          <span class="complimentary">Complimentary</span>
        </div>
        <div v-if="cart.appliedRedemption" class="summary-row discount-row">
          <span>{{ cart.appliedRedemption.reward.title }}</span>
          <span>-{{ formatPrice(cart.discount) }}</span>
        </div>

        <div class="summary-divider"></div>

        <div class="reward-group">
          <template v-if="cart.appliedRedemption">
            <div class="reward-row reward-row-applied">
              <span class="reward-message is-success">
                "{{ cart.appliedRedemption.reward.title }}" applied
              </span>
              <button type="button" class="reward-btn" @click="removeRedemption">Remove</button>
            </div>
          </template>
          <template v-else-if="auth.customer">
            <div class="reward-row">
              <el-select
                v-model="selectedRedemptionId"
                class="reward-select"
                size="large"
                :loading="redemptionsLoading"
                :disabled="redemptionsLoading || !availableRedemptions.length"
                :placeholder="
                  redemptionsLoading
                    ? 'Loading your Paws Rewards…'
                    : availableRedemptions.length
                      ? 'Use a Paws Reward'
                      : 'No Paws Rewards available'
                "
                @change="applyRedemption"
              >
                <el-option
                  v-for="r in availableRedemptions"
                  :key="r.id"
                  :label="rewardLabel(r.reward)"
                  :value="r.id"
                />
              </el-select>
            </div>
            <p
              v-if="!redemptionsLoading && !availableRedemptions.length && redemptionsError"
              class="reward-message"
            >
              Couldn't load your Paws Rewards — check your connection and try again.
            </p>
            <p
              v-else-if="!redemptionsLoading && !availableRedemptions.length"
              class="reward-message"
            >
              Earn points on every order and redeem them for rewards in
              <RouterLink to="/account">your account</RouterLink>.
            </p>
          </template>
          <p v-else class="reward-message">
            <RouterLink to="/login">Sign in</RouterLink> to use a Paws Reward on this order.
          </p>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row total-row">
          <span>Total</span>
          <span>{{ formatPrice(cart.total) }}</span>
        </div>

        <button type="button" class="checkout-btn" @click="proceedToCheckout">
          Proceed to Checkout
        </button>

        <ul class="summary-perks">
          <li>
            <PhTruck :size="18" />
            <span>Nationwide delivery across Cambodia</span>
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
          :to="`/products/${p.slug}`"
          class="related-card"
        >
          <div
            class="related-image"
            :class="{ 'placeholder-img': !p.images.length }"
            :style="p.images.length ? { backgroundImage: `url(${p.images[0]})` } : undefined"
          ></div>
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
  height: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
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

.reward-group {
  margin-bottom: 1rem;
}

.reward-row {
  display: flex;
}

.reward-row-applied {
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.reward-select {
  flex: 1;
  min-width: 0;
}

.reward-btn {
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

.reward-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.reward-message {
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.reward-message.is-success {
  color: var(--color-accent);
  margin-top: 0;
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
  line-height: 0;
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

.sk-item-name {
  width: 75%;
  margin-bottom: 0.4rem;
}

.sk-item-variant {
  width: 40%;
  margin-bottom: 0.9rem;
}

.sk-qty-stepper {
  width: 6rem;
  height: 2.25rem;
}

.sk-item-price {
  width: 3rem;
  justify-self: end;
}

.sk-summary-title {
  width: 60%;
  margin-bottom: 1rem;
}

.sk-summary-row {
  width: 85%;
  margin-bottom: 0.85rem;
}

.sk-checkout-btn {
  display: block;
  width: 100%;
  height: 3rem;
  margin-top: 0.5rem;
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
  height: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #fff;
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
