<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'
import {
  PhLock,
  PhCreditCard,
  PhShield,
  PhShieldCheck,
  PhArrowClockwise,
  PhArrowSquareOut,
  PhQrCode,
  PhCircleNotch,
} from '@phosphor-icons/vue'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'
import { createOrder, createPaymentIntent, type Order } from '../lib/orders'
import { POINTS_PER_DOLLAR } from '../lib/loyalty'
import { stripePromise } from '../lib/stripe'

type Step = 'shipping' | 'payment' | 'review'

const steps: { key: Step; number: string; label: string }[] = [
  { key: 'shipping', number: '01', label: 'Shipping' },
  { key: 'payment', number: '02', label: 'Payment' },
  { key: 'review', number: '03', label: 'Review' },
]

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()

const currentStep = ref<Step>('shipping')

const stepIndex = computed(() => steps.findIndex((s) => s.key === currentStep.value))

interface ShippingForm {
  fullName: string
  phone: string
  street: string
  city: string
  postalCode: string
  method: 'standard' | 'express'
}

const shippingForm = reactive<ShippingForm>({
  fullName: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  method: 'standard',
})

const shippingCost = computed(() => (shippingForm.method === 'express' ? 25.0 : 0))

const estimatedTax = computed(() => (cart.total + shippingCost.value) * 0.0875)

const orderTotal = computed(() => cart.total + shippingCost.value + estimatedTax.value)

// Points are only credited once a payment actually clears (see orders.py's
// award_points_for_order) — for KHQR that's still a manual admin step (4.1),
// so this estimate only reflects what Visa/ABA orders earn immediately.
const estimatedPoints = computed(() => Math.floor((cart.subtotal - cart.discount) * POINTS_PER_DOLLAR))

type PaymentMethod = 'visa' | 'aba_payway' | 'khqr'

const paymentMethods: { key: PaymentMethod; label: string }[] = [
  { key: 'visa', label: 'Visa' },
  { key: 'khqr', label: 'KHQR' },
]

const paymentMethod = ref<PaymentMethod>('visa')

interface PaymentForm {
  cardholderName: string
  billingSameAsShipping: boolean
}

const paymentForm = reactive<PaymentForm>({
  cardholderName: '',
  billingSameAsShipping: true,
})

const cardElementRef = ref<HTMLDivElement | null>(null)
const cardError = ref<string | null>(null)
const cardComplete = ref(false)
let stripe: Stripe | null = null
let elements: StripeElements | null = null
let cardElement: StripeCardElement | null = null

async function mountCardElement() {
  if (!stripe) {
    stripe = await stripePromise
  }
  if (!stripe || !cardElementRef.value) return

  if (!elements) {
    elements = stripe.elements()
  }
  if (!cardElement) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    cardElement = elements.create('card', {
      hidePostalCode: true,
      style: {
        base: {
          color: isDark ? '#dcdcdc' : '#303133',
          '::placeholder': { color: isDark ? '#707070' : '#a8abb2' },
        },
      },
    })
    cardElement.on('change', (event) => {
      cardError.value = event.error?.message ?? null
      cardComplete.value = event.complete
    })
  } else {
    cardElement.unmount()
  }
  cardElement.mount(cardElementRef.value)
}

watch(
  () => currentStep.value === 'payment' && paymentMethod.value === 'visa',
  (shouldMount) => {
    if (shouldMount) mountCardElement()
  },
  { immediate: true, flush: 'post' },
)

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function goToPayment() {
  currentStep.value = 'payment'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goToReview() {
  if (paymentMethod.value === 'visa' && !cardComplete.value) {
    cardError.value = cardError.value ?? 'Enter your card details to continue'
    return
  }
  currentStep.value = 'review'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function editStep(step: Step) {
  currentStep.value = step
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const isProcessing = ref(false)
const khqrModalVisible = ref(false)
const placedOrder = ref<Order | null>(null)

async function placeOrder() {
  if (!auth.session) {
    router.push({ name: 'login', query: { redirect: '/checkout' } })
    return
  }

  isProcessing.value = true
  try {
    const cartItems = cart.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    }))

    let paymentIntentId: string | null = null

    if (paymentMethod.value === 'visa') {
      if (!stripe || !cardElement) {
        throw new Error('Payment form is not ready yet — please try again')
      }
      const { client_secret: clientSecret } = await createPaymentIntent(
        {
          items: cartItems,
          shipping_method: shippingForm.method,
          voucher_code: cart.appliedVoucher?.code ?? null,
        },
        auth.session.access_token,
      )
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: paymentForm.cardholderName },
        },
      })
      if (error || paymentIntent?.status !== 'succeeded') {
        ElMessage.error(error?.message ?? 'Card was declined')
        return
      }
      paymentIntentId = paymentIntent.id
    }

    const order = await createOrder(
      {
        items: cartItems,
        shipping: {
          full_name: shippingForm.fullName,
          phone: shippingForm.phone,
          street: shippingForm.street,
          city: shippingForm.city,
          postal_code: shippingForm.postalCode,
          method: shippingForm.method,
        },
        payment_method: paymentMethod.value,
        voucher_code: cart.appliedVoucher?.code ?? null,
        payment_intent_id: paymentIntentId,
      },
      auth.session.access_token,
    )
    placedOrder.value = order
    cart.clear()

    if (paymentMethod.value === 'khqr') {
      khqrModalVisible.value = true
    } else {
      router.push({ name: 'order-confirm', query: { orderId: String(order.id) } })
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not place order')
  } finally {
    isProcessing.value = false
  }
}

function confirmKhqrPayment() {
  khqrModalVisible.value = false
  if (!placedOrder.value) return
  router.push({ name: 'order-confirm', query: { orderId: String(placedOrder.value.id) } })
}

const paymentMethodLabel = computed(
  () => paymentMethods.find((m) => m.key === paymentMethod.value)?.label ?? '',
)

const shippingMethodLabel = computed(() =>
  shippingForm.method === 'express'
    ? 'Express Shipping — Overnight Delivery'
    : 'Standard Delivery — 3-5 Business Days',
)
</script>

<template>
  <div class="checkout">
    <div class="stepper">
      <template v-for="(step, i) in steps" :key="step.key">
        <div class="step" :class="{ 'is-active': i === stepIndex, 'is-done': i < stepIndex }">
          <span class="step-number">{{ step.number }}</span>
          <span class="step-label">{{ step.label }}</span>
        </div>
        <div v-if="i < steps.length - 1" class="step-connector"></div>
      </template>
    </div>
    <div class="stepper-divider"></div>

    <div class="checkout-body">
      <div class="checkout-main">
        <section v-show="currentStep === 'shipping'" class="shipping-step">
          <h1 class="step-title">Shipping Information</h1>
          <p class="step-subtitle">Step 1 of 3: Please provide your delivery details.</p>

          <form class="shipping-form" @submit.prevent="goToPayment">
            <div class="form-row">
              <div class="form-field">
                <label for="fullName">Full Name</label>
                <input id="fullName" v-model="shippingForm.fullName" type="text" required />
              </div>
              <div class="form-field">
                <label for="phone">Phone Number</label>
                <input id="phone" v-model="shippingForm.phone" type="tel" required />
              </div>
            </div>

            <div class="form-field">
              <label for="street">Street Address</label>
              <input id="street" v-model="shippingForm.street" type="text" required />
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="city">City</label>
                <input id="city" v-model="shippingForm.city" type="text" required />
              </div>
              <div class="form-field">
                <label for="postalCode">Postal Code</label>
                <input id="postalCode" v-model="shippingForm.postalCode" type="text" required />
              </div>
            </div>

            <div class="shipping-method">
              <h2 class="method-title">Shipping Method</h2>
              <div class="method-divider"></div>

              <label class="method-option" :class="{ 'is-selected': shippingForm.method === 'standard' }">
                <input v-model="shippingForm.method" type="radio" name="method" value="standard" />
                <span class="method-radio"></span>
                <span class="method-info">
                  <span class="method-name">Standard Delivery</span>
                  <span class="method-detail">3-5 Business Days</span>
                </span>
                <span class="method-price complimentary">Complimentary</span>
              </label>

              <label class="method-option" :class="{ 'is-selected': shippingForm.method === 'express' }">
                <input v-model="shippingForm.method" type="radio" name="method" value="express" />
                <span class="method-radio"></span>
                <span class="method-info">
                  <span class="method-name">Express Shipping</span>
                  <span class="method-detail">Overnight Delivery</span>
                </span>
                <span class="method-price">$25.00</span>
              </label>
            </div>

            <button type="submit" class="continue-btn">Continue to Payment</button>
          </form>
        </section>

        <section v-show="currentStep === 'payment'" class="payment-step">
          <div class="secure-banner">
            <PhLock :size="18" />
            <span>Encrypted Secure Transaction</span>
          </div>

          <div class="payment-method-select">
            <button
              v-for="method in paymentMethods"
              :key="method.key"
              type="button"
              class="payment-method-btn"
              :class="{ 'is-selected': paymentMethod === method.key }"
              @click="paymentMethod = method.key"
            >
              {{ method.label }}
            </button>
          </div>

          <h1 class="step-title payment-title">Payment Details</h1>

          <form class="payment-form" @submit.prevent="goToReview">
            <template v-if="paymentMethod === 'khqr'">
              <div class="redirect-panel">
                <PhQrCode :size="32" />
                <p class="redirect-note">
                  You'll scan a KHQR code with your banking app to complete this payment on the
                  next step.
                </p>
              </div>
            </template>

            <template v-else-if="paymentMethod === 'aba_payway'">
              <div class="redirect-panel">
                <PhArrowSquareOut :size="32" />
                <p class="redirect-note">
                  You'll be redirected to ABA PayWay's secure checkout to enter your card or
                  account details and complete this payment.
                </p>
              </div>
            </template>

            <template v-else>
              <div class="form-field">
                <label for="cardholderName">Cardholder Name</label>
                <input
                  id="cardholderName"
                  v-model="paymentForm.cardholderName"
                  type="text"
                  placeholder="Joe"
                  required
                />
              </div>

              <div class="form-field">
                <label for="cardElement">Card Details</label>
                <div id="cardElement" ref="cardElementRef" class="card-element"></div>
                <p v-if="cardError" class="card-error">{{ cardError }}</p>
              </div>

              <label class="billing-checkbox">
                <input v-model="paymentForm.billingSameAsShipping" type="checkbox" />
                <span class="checkbox-box"></span>
                <span>Billing address same as shipping</span>
              </label>
            </template>

            <button type="submit" class="continue-btn">Continue to Review</button>
          </form>

          <div class="trust-badges">
            <PhShield :size="22" />
            <PhShieldCheck :size="22" />
            <PhArrowClockwise :size="22" />
          </div>
        </section>

        <section v-show="currentStep === 'review'" class="review-step">
          <h1 class="step-title">Review Your Order</h1>
          <p class="step-subtitle">Step 3 of 3: Confirm your details before placing the order.</p>

          <div class="review-section">
            <div class="review-section-header">
              <h2 class="review-section-title">Shipping Information</h2>
              <button type="button" class="edit-link" @click="editStep('shipping')">Edit</button>
            </div>
            <div class="review-grid">
              <div>
                <p class="review-label">Recipient</p>
                <p class="review-value">{{ shippingForm.fullName || '—' }}</p>
                <p class="review-value">{{ shippingForm.phone || '—' }}</p>
              </div>
              <div>
                <p class="review-label">Address</p>
                <p class="review-value">{{ shippingForm.street || '—' }}</p>
                <p class="review-value">
                  {{ [shippingForm.city, shippingForm.postalCode].filter(Boolean).join(', ') || '—' }}
                </p>
              </div>
            </div>
          </div>

          <div class="review-section">
            <h2 class="review-section-title">Delivery Method</h2>
            <div class="review-row">
              <span>{{ shippingMethodLabel }}</span>
              <span>{{ shippingCost === 0 ? 'Complimentary' : formatPrice(shippingCost) }}</span>
            </div>
          </div>

          <div class="review-section">
            <div class="review-section-header">
              <h2 class="review-section-title">Payment Details</h2>
              <button type="button" class="edit-link" @click="editStep('payment')">Edit</button>
            </div>
            <div class="payment-summary-card">
              <PhCreditCard v-if="paymentMethod === 'visa'" :size="20" />
              <PhArrowSquareOut v-else-if="paymentMethod === 'aba_payway'" :size="20" />
              <PhQrCode v-else :size="20" />
              <div>
                <p class="payment-summary-method">{{ paymentMethodLabel }}</p>
                <p class="payment-summary-detail">
                  <template v-if="paymentMethod === 'visa'">Card charged on order placement</template>
                  <template v-else-if="paymentMethod === 'aba_payway'">Redirect at checkout</template>
                  <template v-else>Scan to pay</template>
                </p>
              </div>
            </div>
          </div>

          <div class="review-section">
            <h2 class="review-section-title">Your Selection ({{ cart.itemCount }})</h2>
            <div class="review-items">
              <div v-for="item in cart.items" :key="item.productId" class="review-item">
                <RouterLink
                  :to="`/products/${item.slug}`"
                  class="review-item-image"
                  :class="{ 'placeholder-img': !item.image }"
                  :style="item.image ? { backgroundImage: `url(${item.image})` } : undefined"
                />
                <div class="review-item-details">
                  <p class="review-item-name">{{ item.name }}</p>
                  <p v-if="item.brand" class="review-item-variant">{{ item.brand }}</p>
                </div>
                <div class="review-item-aside">
                  <p class="review-item-price">{{ formatPrice(item.price * item.quantity) }}</p>
                  <p class="review-item-qty">Qty: {{ item.quantity }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="order-summary">
        <h2 class="summary-title">Order Summary</h2>
        <div class="summary-divider"></div>

        <div v-if="currentStep !== 'review'" class="summary-items">
          <div v-for="item in cart.items" :key="item.productId" class="summary-item">
            <RouterLink
              :to="`/products/${item.slug}`"
              class="summary-item-image"
              :class="{ 'placeholder-img': !item.image }"
              :style="item.image ? { backgroundImage: `url(${item.image})` } : undefined"
            />
            <div class="summary-item-details">
              <p class="summary-item-name">{{ item.name }}</p>
              <p v-if="item.brand" class="summary-item-variant">{{ item.brand.toUpperCase() }}</p>
              <div class="summary-item-bottom">
                <span class="summary-item-qty">Qty: {{ item.quantity }}</span>
                <span class="summary-item-price">{{ formatPrice(item.price * item.quantity) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(cart.subtotal) }}</span>
        </div>
        <div v-if="cart.appliedVoucher" class="summary-row discount-row">
          <span>Discount ({{ cart.appliedVoucher.code }})</span>
          <span>-{{ formatPrice(cart.discount) }}</span>
        </div>
        <div class="summary-row">
          <span>Shipping</span>
          <span :class="{ complimentary: shippingCost === 0 }">
            {{ shippingCost === 0 ? 'Complimentary' : formatPrice(shippingCost) }}
          </span>
        </div>
        <div class="summary-row">
          <span>Estimated Tax</span>
          <span>{{ formatPrice(estimatedTax) }}</span>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row total-row">
          <span>Total</span>
          <span>{{ formatPrice(orderTotal) }}</span>
        </div>

        <p v-if="estimatedPoints > 0" class="points-note">
          <template v-if="paymentMethod === 'khqr'">
            Earn {{ estimatedPoints.toLocaleString('en-US') }} points once payment is confirmed
          </template>
          <template v-else>
            You'll earn {{ estimatedPoints.toLocaleString('en-US') }} points with this order
          </template>
        </p>

        <template v-if="currentStep === 'review'">
          <button
            type="button"
            class="place-order-btn"
            :disabled="isProcessing"
            @click="placeOrder"
          >
            <PhCircleNotch v-if="isProcessing" :size="16" class="spin" />
            {{ isProcessing ? 'Processing…' : 'Place Order' }}
          </button>
          <p class="terms-note">By placing this order, you agree to our terms of sale.</p>
          <div class="summary-divider"></div>
        </template>

        <p class="secure-note">
          <PhLock :size="16" />
          Secure checkout guaranteed
        </p>
      </aside>
    </div>

    <el-dialog
      v-model="khqrModalVisible"
      title="Scan to Pay"
      width="380px"
      class="khqr-dialog"
      align-center
    >
      <div class="khqr-modal-content">
        <div class="khqr-placeholder">KHQR CODE</div>
        <p class="khqr-modal-amount">{{ formatPrice(placedOrder?.total ?? orderTotal) }}</p>
        <p class="khqr-modal-note">
          Scan this code with any Bakong-linked banking app, then confirm once the transfer is
          complete.
        </p>
        <button type="button" class="continue-btn" @click="confirmKhqrPayment">
          I Have Paid
        </button>
      </div>
    </el-dialog>
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

.checkout {
  padding: 1rem 0 4rem;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  opacity: 0.4;
}

.step.is-active,
.step.is-done {
  opacity: 1;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text);
}

.step.is-active .step-number {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
}

.step-label {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}

.step.is-active .step-label {
  font-weight: 600;
  color: var(--color-heading);
}

.step-connector {
  flex: 1;
  max-width: 4rem;
  height: 1px;
  background: var(--color-border);
  margin: 0 1rem;
}

.stepper-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 2.5rem;
}

/* Body layout */
.checkout-body {
  display: grid;
  grid-template-columns: 1fr 450px;
  gap: 3rem;
  align-items: start;
}

.step-title {
  font-size: 2.25rem;
  margin-bottom: 0.4rem;
}

.step-subtitle {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 2rem;
}

/* Form */
.shipping-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
}

.form-field input {
  height: 2.75rem;
  padding: 0 0.9rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Shipping method */
.shipping-method {
  margin-top: 0.5rem;
}

.method-title {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

.method-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 1rem;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-border);
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.method-option.is-selected {
  border-color: var(--color-accent);
  background: var(--color-background-soft);
}

.method-option input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.method-radio {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  position: relative;
}

.method-option.is-selected .method-radio {
  border-color: var(--color-accent);
}

.method-option.is-selected .method-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--color-accent);
}

.method-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.method-name {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-heading);
}

.method-detail {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
}

.method-price {
  font-size: 0.9rem;
  color: var(--color-heading);
}

.method-price.complimentary {
  color: var(--color-accent);
  font-weight: 600;
}

.continue-btn {
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
  margin-top: 0.5rem;
}

.continue-btn:hover {
  background: var(--color-accent-dark);
}

/* Payment step */
.secure-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 3rem;
  padding: 0 1.1rem;
  background: var(--color-ink);
  color: #fff;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 2rem;
}

.payment-method-select {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.payment-method-btn {
  height: 3rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  line-height: 0;
}

.payment-method-btn:hover {
  border-color: var(--color-accent);
}

.payment-method-btn.is-selected {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
}

.payment-title {
  margin-bottom: 1.5rem;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.khqr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 180px;
  border: 1px dashed var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  opacity: 0.5;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.redirect-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
  padding: 2.5rem 1.5rem;
  border: 1px dashed var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.redirect-panel svg {
  opacity: 0.5;
}

.redirect-note {
  max-width: 320px;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.input-with-icon {
  position: relative;
}

.input-with-icon input {
  width: 100%;
  padding-right: 2.75rem;
}

.input-icon {
  position: absolute;
  right: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text);
  opacity: 0.5;
  pointer-events: none;
}

.card-element {
  height: 2.75rem;
  padding: 0.85rem 0.9rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.card-error {
  font-size: 0.78rem;
  color: #d64545;
}

.billing-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-heading);
  cursor: pointer;
}

.billing-checkbox input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  flex-shrink: 0;
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid var(--color-border);
  position: relative;
}

.billing-checkbox input:checked + .checkbox-box {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.billing-checkbox input:checked + .checkbox-box::after {
  content: '';
  position: absolute;
  left: 0.35rem;
  top: 0.12rem;
  width: 0.3rem;
  height: 0.6rem;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.trust-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-text);
  opacity: 0.55;
}

/* Review step */
.review-section {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.review-section:first-of-type {
  padding-top: 0;
}

.review-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.review-section-title {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
  margin-bottom: 1rem;
}

.review-section-header .review-section-title {
  margin-bottom: 0;
}

.edit-link {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: underline;
  color: var(--color-accent);
  cursor: pointer;
}

.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.review-label {
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.4rem;
}

.review-value {
  font-size: 0.9rem;
  color: var(--color-text);
}

.review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text);
}

.payment-summary-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.payment-summary-method {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.payment-summary-detail {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.7;
}

.review-items {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.review-item {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 1.1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--color-border);
}

.review-item-image {
  display: block;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
}

.review-item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.3rem;
}

.review-item-variant {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.65;
}

.review-item-aside {
  text-align: right;
}

.review-item-price {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.2rem;
}

.review-item-qty {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
}

/* Order summary */
.order-summary {
  background: var(--color-background-soft);
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
  gap: 1.25rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 0.9rem;
}

.summary-item-image {
  display: block;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
}

.summary-item-details {
  display: flex;
  flex-direction: column;
}

.summary-item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.2rem;
}

.summary-item-variant {
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.5rem;
}

.summary-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text);
  margin-top: auto;
}

.summary-item-price {
  font-weight: 600;
  color: var(--color-heading);
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

.total-row {
  font-family: var(--font-sans);
  font-size: 1.25rem;
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.total-row span:last-child {
  color: var(--color-accent);
}

.points-note {
  font-size: 0.78rem;
  color: var(--color-accent);
  margin-bottom: 1.25rem;
}

.secure-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.8;
}

.place-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  height: 3rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 0.9rem;
}

.place-order-btn:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

.place-order-btn:disabled {
  opacity: 0.75;
  cursor: default;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.terms-note {
  font-size: 0.72rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 1rem;
}

/* KHQR modal */
.khqr-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.khqr-modal-amount {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--color-heading);
  margin-bottom: 0.75rem;
}

.khqr-modal-note {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 1.5rem;
}

.khqr-dialog .continue-btn {
  margin-top: 0;
}

@media (max-width: 900px) {
  .checkout-body {
    grid-template-columns: 1fr;
  }

  .form-row,
  .review-grid {
    grid-template-columns: 1fr;
  }
}
</style>
