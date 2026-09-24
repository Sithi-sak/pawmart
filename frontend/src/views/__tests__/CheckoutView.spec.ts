import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Fragment, defineComponent, h, type VNode } from 'vue'
import type { CartItem } from '@/stores/cart'

const createOrderMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  createOrder: (...args: unknown[]) => createOrderMock(...args),
}))

const elMessageErrorMock = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: { error: (...args: unknown[]) => elMessageErrorMock(...args) },
}))

let mockCartItems: CartItem[] = []
let mockAppliedRedemption: {
  id: number
  reward: { title: string; discount_amount: number | null; free_shipping: boolean }
} | null = null
const cartClearMock = vi.fn()
vi.mock('@/stores/cart', () => ({
  useCartStore: () => ({
    get items() {
      return mockCartItems
    },
    get appliedRedemption() {
      return mockAppliedRedemption
    },
    get itemCount() {
      return mockCartItems.reduce((sum, i) => sum + i.quantity, 0)
    },
    get subtotal() {
      return mockCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },
    get discount() {
      const amount = mockAppliedRedemption?.reward.discount_amount ?? 0
      return Math.min(amount, this.subtotal)
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
    return () =>
      props.modelValue ? h('div', { class: 'el-dialog-stub' }, slots.default?.()) : null
  },
})

// The real el-select renders a popper-based dropdown that jsdom can't drive
// directly, so this stub reads the <el-option> vnodes passed as its default
// slot and renders a plain native <select> instead — enough for tests to
// pick a value and drive v-model.
// v-for as a slot's only content compiles to a single keyed Fragment vnode
// wrapping the real per-item vnodes in `.children`, not a flat array, so it
// needs unwrapping before reading each option's props.
function flattenVNodes(nodes: unknown[]): VNode[] {
  return nodes.flatMap((node) => {
    if (Array.isArray(node)) return flattenVNodes(node)
    const vnode = node as VNode
    if (vnode?.type === Fragment && Array.isArray(vnode.children)) {
      return flattenVNodes(vnode.children)
    }
    return [vnode]
  })
}

const ElSelectStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  inheritAttrs: false,
  setup(props, { emit, attrs, slots }) {
    return () => {
      const options = flattenVNodes(slots.default?.() ?? []).map((vnode) => {
        const optionProps = vnode.props as { value?: string; label?: string } | null
        return { value: optionProps?.value ?? '', label: optionProps?.label ?? '' }
      })
      return h(
        'select',
        {
          id: attrs.id,
          disabled: attrs.disabled,
          value: props.modelValue,
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value),
        },
        [
          h('option', { value: '' }, ''),
          ...options.map((opt) => h('option', { value: opt.value }, opt.label)),
        ],
      )
    }
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
  return mount(CheckoutView, {
    global: { stubs: { ElDialog: ElDialogStub, ElSelect: ElSelectStub } },
  })
}

async function selectFirstOption(wrapper: ReturnType<typeof mountCheckout>, selector: string) {
  const select = wrapper.find(selector)
  const value = (select.element as HTMLSelectElement).options[1]!.value
  await select.setValue(value)
}

async function fillShippingAndContinue(wrapper: ReturnType<typeof mountCheckout>) {
  await wrapper.find('#fullName').setValue('Jane Doe')
  await wrapper.find('#phone').setValue('012345678')
  await selectFirstOption(wrapper, '#province')
  await selectFirstOption(wrapper, '#district')
  await selectFirstOption(wrapper, '#commune')
  await selectFirstOption(wrapper, '#village')
  await wrapper.find('#street').setValue('123 Main St')
  await wrapper.find('.shipping-form').trigger('submit.prevent')
}

async function selectPaymentMethod(wrapper: ReturnType<typeof mountCheckout>, label: string) {
  const buttons = wrapper.findAll('.payment-method-btn')
  const button = buttons.find((b) => b.text() === label)!
  await button.trigger('click')
}

async function completeVisaCardEntry(
  wrapper: ReturnType<typeof mountCheckout>,
  cardNumber = '4242424242424242',
) {
  await wrapper.find('#cardholderName').setValue('Jane Doe')
  await wrapper.find('#cardNumber').setValue(cardNumber)
  await wrapper.find('#cardExpiry').setValue('1299')
  await wrapper.find('#cardCvv').setValue('123')
}

// Visa placement waits on a simulated authorization delay (setTimeout).
async function placeVisaOrder(wrapper: ReturnType<typeof mountCheckout>) {
  vi.useFakeTimers()
  try {
    await wrapper.find('.place-order-btn').trigger('click')
    await vi.runAllTimersAsync()
  } finally {
    vi.useRealTimers()
  }
  await flushPromises()
}

async function goToReview(wrapper: ReturnType<typeof mountCheckout>) {
  await wrapper.find('.payment-form').trigger('submit.prevent')
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockCartItems = [makeCartItem()]
  mockAppliedRedemption = null
})

describe('CheckoutView', () => {
  describe('Visa payment', () => {
    it('creates the order on a valid card', async () => {
      createOrderMock.mockResolvedValue({ id: 42, total: 21.75 })

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await completeVisaCardEntry(wrapper)
      await goToReview(wrapper)

      await placeVisaOrder(wrapper)

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ product_id: 1, quantity: 1 }],
          payment_method: 'visa',
        }),
        'tok-1',
      )
      expect(cartClearMock).toHaveBeenCalled()
      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'order-confirm',
        query: { orderId: '42' },
      })
    })

    it('shows the decline error and never creates an order when the card is declined', async () => {
      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await completeVisaCardEntry(wrapper, '4000000000000002')
      await goToReview(wrapper)

      await placeVisaOrder(wrapper)

      expect(elMessageErrorMock).toHaveBeenCalledWith('Your card was declined')
      expect(createOrderMock).not.toHaveBeenCalled()
      expect(cartClearMock).not.toHaveBeenCalled()
      expect(routerPushMock).not.toHaveBeenCalled()
      // Stays on the review step so the customer can retry.
      expect(wrapper.find('.review-step').isVisible()).toBe(true)
    })

    it('blocks moving to review until the card details are complete', async () => {
      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)

      await goToReview(wrapper)

      expect(wrapper.find('.card-error').exists()).toBe(true)
      expect(wrapper.find('.payment-step').isVisible()).toBe(true)
    })

    it('rejects a card number that is too short', async () => {
      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await completeVisaCardEntry(wrapper, '424242424242')

      await goToReview(wrapper)

      expect(wrapper.find('.card-error').text()).toBe('Enter a valid card number')
      expect(wrapper.find('.payment-step').isVisible()).toBe(true)
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
        expect.objectContaining({ payment_method: 'khqr' }),
        'tok-1',
      )
      expect(routerPushMock).not.toHaveBeenCalled()
      expect(wrapper.find('.el-dialog-stub').exists()).toBe(true)

      await wrapper.find('.khqr-dialog .continue-btn').trigger('click')

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'order-confirm',
        query: { orderId: '44' },
      })
    })
  })

  describe('stock-limit edge case', () => {
    it('surfaces the backend stock error and leaves the order unplaced', async () => {
      createOrderMock.mockRejectedValue(new Error("Not enough stock for 'Chew Toy'"))

      const wrapper = mountCheckout()
      await fillShippingAndContinue(wrapper)
      await selectPaymentMethod(wrapper, 'KHQR')
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
