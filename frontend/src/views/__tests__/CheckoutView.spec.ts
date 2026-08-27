import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { CartItem } from '@/stores/cart'

const createOrderMock = vi.fn()
const createPaymentIntentMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  createOrder: (...args: unknown[]) => createOrderMock(...args),
  createPaymentIntent: (...args: unknown[]) => createPaymentIntentMock(...args),
}))

const elMessageErrorMock = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: { error: (...args: unknown[]) => elMessageErrorMock(...args) },
}))

// Fake Stripe.js: confirmCardPayment is the only method the component's
// success/decline branching actually depends on; elements()/create() just
// need to hand back something mountable with an `on('change', ...)` hook.
const confirmCardPaymentMock = vi.fn()
let cardChangeHandler: ((event: { complete: boolean; error?: { message: string } }) => void) | undefined
const fakeCardElement = {
  on: vi.fn((event: string, cb: typeof cardChangeHandler) => {
    if (event === 'change') cardChangeHandler = cb
  }),
  mount: vi.fn(),
  unmount: vi.fn(),
}
const fakeStripe = {
  elements: vi.fn(() => ({ create: vi.fn(() => fakeCardElement) })),
  confirmCardPayment: (...args: unknown[]) => confirmCardPaymentMock(...args),
}
vi.mock('@/lib/stripe', () => ({ stripePromise: Promise.resolve(fakeStripe) }))

let mockCartItems: CartItem[] = []
let mockAppliedVoucher: { code: string; rate: number } | null = null
const cartClearMock = vi.fn()
vi.mock('@/stores/cart', () => ({
  useCartStore: () => ({
    get items() {
      return mockCartItems
    },
    get appliedVoucher() {
      return mockAppliedVoucher
    },
    get itemCount() {
      return mockCartItems.reduce((sum, i) => sum + i.quantity, 0)
    },
    get subtotal() {
      return mockCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },
    get discount() {
      return mockAppliedVoucher ? this.subtotal * mockAppliedVoucher.rate : 0
    },
    get total() {
      return this.subtotal - this.discount
    },
    clear: cartClearMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ session: { access_token: 'tok-1' } }),
}))

const routerPushMock = vi.fn()
vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
  useRouter: () => ({ push: routerPushMock }),
}))

const ElDialogStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'el-dialog-stub' }, slots.default?.()) : null)
  },
})

const { default: CheckoutView } = await import('../CheckoutView.vue')

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 1,
    slug: 'chew-toy',
    name: 'Chew Toy',
    brand: 'Acme',
    image: null,
    price: 20,
    quantity: 1,
    storeId: 10,
    storeName: 'Acme Shop',
    ...overrides,
  }
}

function mountCheckout() {
  return mount(CheckoutView, { global: { stubs: { ElDialog: ElDialogStub } } })
}

async function fillShippingAndContinue(wrapper: ReturnType<typeof mountCheckout>) {
  await wrapper.find('#fullName').setValue('Jane Doe')
  await wrapper.find('#phone').setValue('012345678')
  await wrapper.find('#street').setValue('123 Main St')
  await wrapper.find('#city').setValue('Phnom Penh')
  await wrapper.find('#postalCode').setValue('12000')
  await wrapper.find('.shipping-form').trigger('submit.prevent')
}

async function selectPaymentMethod(wrapper: ReturnType<typeof mountCheckout>, label: string) {
  const buttons = wrapper.findAll('.payment-method-btn')
  const button = buttons.find((b) => b.text() === label)!
  await button.trigger('click')
}

async function completeVisaCardEntry(wrapper: ReturnType<typeof mountCheckout>) {
  await flushPromises() // let stripePromise resolve and mount the card element
  cardChangeHandler?.({ complete: true })
  await wrapper.find('#cardholderName').setValue('Jane Doe')
}

async function goToReview(wrapper: ReturnType<typeof mountCheckout>) {
  await wrapper.find('.payment-form').trigger('submit.prevent')
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockCartItems = [makeCartItem()]
  mockAppliedVoucher = null
  cardChangeHandler = undefined
})

describe('CheckoutView', () => {
  describe('Visa payment', () => {
    it('charges the card and creates the order on success', async () => {
      createPaymentIntentMock.mockResolvedValue({ client_secret: 'cs_1', payment_intent_id: 'pi_1' })
      confirmCardPaymentMock.mockResolvedValue({ paymentIntent: { id: 'pi_1', status: 'succeeded' } })
      createOrderMock.mockResolvedValue({ id: 42, total: 21.75 })

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await completeVisaCardEntry(wrapper)
      await goToReview(wrapper)

      await wrapper.find('.place-order-btn').trigger('click')
      await flushPromises()

      expect(createPaymentIntentMock).toHaveBeenCalledWith(
        expect.objectContaining({ items: [{ product_id: 1, quantity: 1 }] }),
        'tok-1',
      )
      expect(confirmCardPaymentMock).toHaveBeenCalledWith(
        'cs_1',
        expect.objectContaining({ payment_method: expect.objectContaining({ card: fakeCardElement }) }),
      )
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: 'visa', payment_intent_id: 'pi_1' }),
        'tok-1',
      )
      expect(cartClearMock).toHaveBeenCalled()
      expect(routerPushMock).toHaveBeenCalledWith({ name: 'order-confirm', query: { orderId: '42' } })
    })

    it('shows the decline error and never creates an order when the card is declined', async () => {
      createPaymentIntentMock.mockResolvedValue({ client_secret: 'cs_1', payment_intent_id: 'pi_1' })
      confirmCardPaymentMock.mockResolvedValue({ error: { message: 'Your card was declined.' } })

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await completeVisaCardEntry(wrapper)
      await goToReview(wrapper)

      await wrapper.find('.place-order-btn').trigger('click')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalledWith('Your card was declined.')
      expect(createOrderMock).not.toHaveBeenCalled()
      expect(cartClearMock).not.toHaveBeenCalled()
      expect(routerPushMock).not.toHaveBeenCalled()
      // Stays on the review step so the customer can retry.
      expect(wrapper.find('.review-step').isVisible()).toBe(true)
    })

    it('blocks moving to review until the card details are complete', async () => {
      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await flushPromises()

      await goToReview(wrapper)

      expect(wrapper.find('.card-error').exists()).toBe(true)
      expect(wrapper.find('.payment-step').isVisible()).toBe(true)
    })
  })

  describe('ABA PayWay', () => {
    it('places the order directly with no Stripe interaction', async () => {
      createOrderMock.mockResolvedValue({ id: 43, total: 21.75 })

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await selectPaymentMethod(wrapper, 'ABA PayWay')
      await goToReview(wrapper)

      await wrapper.find('.place-order-btn').trigger('click')
      await flushPromises()

      expect(createPaymentIntentMock).not.toHaveBeenCalled()
      expect(confirmCardPaymentMock).not.toHaveBeenCalled()
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: 'aba_payway', payment_intent_id: null }),
        'tok-1',
      )
      expect(routerPushMock).toHaveBeenCalledWith({ name: 'order-confirm', query: { orderId: '43' } })
    })

    it('shows the redirect-informational panel instead of card fields', async () => {
      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await selectPaymentMethod(wrapper, 'ABA PayWay')

      expect(wrapper.find('.redirect-note').text()).toContain('ABA PayWay')
      expect(wrapper.find('#cardElement').exists()).toBe(false)
    })
  })

  describe('KHQR', () => {
    it('creates the order, then shows the scan-to-pay modal before navigating on "I Have Paid"', async () => {
      createOrderMock.mockResolvedValue({ id: 44, total: 21.75 })

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await selectPaymentMethod(wrapper, 'KHQR')
      await goToReview(wrapper)

      await wrapper.find('.place-order-btn').trigger('click')
      await flushPromises()

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: 'khqr', payment_intent_id: null }),
        'tok-1',
      )
      expect(routerPushMock).not.toHaveBeenCalled()
      expect(wrapper.find('.el-dialog-stub').exists()).toBe(true)

      await wrapper.find('.khqr-dialog .continue-btn').trigger('click')

      expect(routerPushMock).toHaveBeenCalledWith({ name: 'order-confirm', query: { orderId: '44' } })
    })
  })

  describe('stock-limit edge case', () => {
    it('surfaces the backend stock error and leaves the order unplaced', async () => {
      createOrderMock.mockRejectedValue(new Error("Not enough stock for 'Chew Toy'"))

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await selectPaymentMethod(wrapper, 'ABA PayWay')
      await goToReview(wrapper)

      await wrapper.find('.place-order-btn').trigger('click')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalledWith("Not enough stock for 'Chew Toy'")
      expect(cartClearMock).not.toHaveBeenCalled()
      expect(routerPushMock).not.toHaveBeenCalled()
      expect(wrapper.find('.review-step').isVisible()).toBe(true)
    })
  })
})
