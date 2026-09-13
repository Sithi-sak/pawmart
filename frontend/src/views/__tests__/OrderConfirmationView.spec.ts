import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { Order } from '@/lib/orders'

const fetchOrderMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  fetchOrder: (...args: unknown[]) => fetchOrderMock(...args),
}))

let mockSession: { access_token: string } | null = { access_token: 'tok-1' }
const authInitMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    init: authInitMock,
    get session() {
      return mockSession
    },
  }),
}))

let mockQuery: Record<string, string> = { orderId: '42' }
vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
  useRoute: () => ({ query: mockQuery }),
}))

const { default: OrderConfirmationView } = await import('../OrderConfirmationView.vue')

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    order_number: 'PM-000042',
    customer_id: 'cust-1',
    status: 'confirmed',
    shipping_full_name: 'Jane Doe',
    shipping_phone: '012345678',
    shipping_street: '123 Main St',
    shipping_city: 'Phnom Penh',
    shipping_postal_code: '12000',
    shipping_method: 'standard',
    shipping_cost: 0,
    payment_method: 'visa',
    payment_status: 'paid',
    subtotal: 20,
    discount: 0,
    tax: 1.75,
    total: 21.75,
    created_at: '2026-01-01T00:00:00Z',
    items: [{ id: 1, product_id: 1, name: 'Chew Toy', variant: null, sku: null, price: 20, quantity: 1 }],
    status_history: [{ id: 1, order_id: 42, status: 'confirmed', created_at: '2026-01-01T00:00:00Z' }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockSession = { access_token: 'tok-1' }
  mockQuery = { orderId: '42' }
  authInitMock.mockResolvedValue(undefined)
})

async function mountConfirmation() {
  const wrapper = mount(OrderConfirmationView)
  await flushPromises()
  return wrapper
}

describe('OrderConfirmationView', () => {
  it('fetches and renders the real created order', async () => {
    fetchOrderMock.mockResolvedValue(makeOrder())

    const wrapper = await mountConfirmation()

    expect(fetchOrderMock).toHaveBeenCalledWith(42, 'tok-1')
    expect(wrapper.text()).toContain('PM-000042')
    expect(wrapper.text()).toContain('CHEW TOY')
    expect(wrapper.text()).toContain('$21.75')
  })

  it('shows a not-found state when there is no orderId in the query', async () => {
    mockQuery = {}

    const wrapper = await mountConfirmation()

    expect(wrapper.text()).toContain("We couldn't find that order.")
    expect(fetchOrderMock).not.toHaveBeenCalled()
  })

  it('shows a not-found state when there is no session', async () => {
    mockSession = null

    const wrapper = await mountConfirmation()

    expect(wrapper.text()).toContain("We couldn't find that order.")
    expect(fetchOrderMock).not.toHaveBeenCalled()
  })

  it('shows a not-found state when fetching the order fails', async () => {
    fetchOrderMock.mockRejectedValue(new Error('not found'))

    const wrapper = await mountConfirmation()

    expect(wrapper.text()).toContain("We couldn't find that order.")
  })

  it('shows points earned for a KHQR order same as any other payment method', async () => {
    fetchOrderMock.mockResolvedValue(
      makeOrder({ payment_method: 'khqr', payment_status: 'paid', subtotal: 100, discount: 0 }),
    )

    const wrapper = await mountConfirmation()

    expect(wrapper.text()).toContain('Paws Rewards points')
  })

  it('shows points earned for a paid order', async () => {
    fetchOrderMock.mockResolvedValue(makeOrder({ subtotal: 100, discount: 0, payment_status: 'paid' }))

    const wrapper = await mountConfirmation()

    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('Paws Rewards points')
  })
})
