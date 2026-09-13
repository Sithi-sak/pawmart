import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { Order, OrderStatus } from '@/lib/orders'

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

vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
}))

const { default: OrderTrackingView } = await import('../OrderTrackingView.vue')

const STATUS_ORDER: OrderStatus[] = ['confirmed', 'processing', 'shipping', 'out_for_delivery', 'delivered']
const STEP_LABELS = ['Confirmed', 'Processing', 'Shipping', 'Out for Delivery', 'Delivered']

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 7,
    order_number: 'PM-000007',
    customer_id: 'cust-1',
    status: 'processing',
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
    status_history: [
      { id: 1, order_id: 7, status: 'confirmed', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, order_id: 7, status: 'processing', created_at: '2026-01-02T00:00:00Z' },
    ],
    ...overrides,
  }
}

// Builds a status_history covering every step from "confirmed" through the
// given index into STATUS_ORDER, mirroring how the backend only ever
// appends forward (task 3.3/3.10.9 — statuses can't be skipped or reversed).
function historyThroughIndex(doneIndex: number) {
  return STATUS_ORDER.slice(0, doneIndex + 1).map((status, i) => ({
    id: i + 1,
    order_id: 7,
    status,
    created_at: `2026-01-0${i + 1}T00:00:00Z`,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockSession = { access_token: 'tok-1' }
  authInitMock.mockResolvedValue(undefined)
})

async function mountTracking(id = '7') {
  const wrapper = mount(OrderTrackingView, { props: { id } })
  await flushPromises()
  return wrapper
}

describe('OrderTrackingView', () => {
  it('fetches the order for the given id', async () => {
    fetchOrderMock.mockResolvedValue(makeOrder())

    await mountTracking('7')

    expect(fetchOrderMock).toHaveBeenCalledWith(7, 'tok-1')
  })

  it.each([
    ['confirmed', 0],
    ['processing', 1],
    ['shipping', 2],
    ['out_for_delivery', 3],
    ['delivered', 4],
  ] as const)('marks exactly the steps up through "%s" as done', async (status, doneIndex) => {
    fetchOrderMock.mockResolvedValue(makeOrder({ status, status_history: historyThroughIndex(doneIndex) }))

    const wrapper = await mountTracking()

    const steps = wrapper.findAll('.timeline-step')
    expect(steps).toHaveLength(5)
    steps.forEach((step, i) => {
      expect(step.classes().includes('is-done')).toBe(i <= doneIndex)
      expect(step.text()).toContain(STEP_LABELS[i])
    })
  })

  it('shows a date only for steps that have actually happened', async () => {
    fetchOrderMock.mockResolvedValue(makeOrder({ status: 'processing', status_history: historyThroughIndex(1) }))

    const wrapper = await mountTracking()

    const steps = wrapper.findAll('.timeline-step')
    expect(steps[0].find('.step-date').exists()).toBe(true)
    expect(steps[1].find('.step-date').exists()).toBe(true)
    expect(steps[2].find('.step-date').exists()).toBe(false)
  })

  it('renders order number, items, and totals', async () => {
    fetchOrderMock.mockResolvedValue(makeOrder())

    const wrapper = await mountTracking()

    expect(wrapper.text()).toContain('PM-000007')
    expect(wrapper.text()).toContain('Chew Toy')
    expect(wrapper.text()).toContain('$21.75')
  })

  it('shows a not-found state when the id is not a valid number', async () => {
    const wrapper = await mountTracking('not-a-number')

    expect(wrapper.text()).toContain("We couldn't find that order.")
    expect(fetchOrderMock).not.toHaveBeenCalled()
  })

  it('shows a not-found state when there is no session', async () => {
    mockSession = null

    const wrapper = await mountTracking()

    expect(wrapper.text()).toContain("We couldn't find that order.")
    expect(fetchOrderMock).not.toHaveBeenCalled()
  })

  it('shows a not-found state when fetching the order fails', async () => {
    fetchOrderMock.mockRejectedValue(new Error('not found'))

    const wrapper = await mountTracking()

    expect(wrapper.text()).toContain("We couldn't find that order.")
  })
})
