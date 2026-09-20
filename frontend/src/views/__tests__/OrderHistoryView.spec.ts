import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { OrderSummary } from '@/lib/orders'

const fetchOrdersMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  fetchOrders: (...args: unknown[]) => fetchOrdersMock(...args),
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
      return () => h('a', { to: props.to }, slots.default?.())
    },
  }),
}))

const { default: OrderHistoryView } = await import('../OrderHistoryView.vue')

function makeOrderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 7,
    order_number: 'PM-000007',
    status: 'shipping',
    total: 21.75,
    created_at: '2026-01-01T00:00:00Z',
    item_count: 2,
    payment_method: 'visa',
    payment_status: 'paid',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockSession = { access_token: 'tok-1' }
  authInitMock.mockResolvedValue(undefined)
})

async function mountHistory() {
  const wrapper = mount(OrderHistoryView)
  await flushPromises()
  return wrapper
}

describe('OrderHistoryView', () => {
  it('renders the order list with number, status, item count, and total', async () => {
    fetchOrdersMock.mockResolvedValue([makeOrderSummary()])

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('PM-000007')
    expect(wrapper.text()).toContain('SHIPPING')
    expect(wrapper.text()).toContain('2 ITEMS')
    expect(wrapper.text()).toContain('$21.75')
    expect(wrapper.text()).toContain('1 Order')
  })

  it('links each order card to its own tracking page', async () => {
    fetchOrdersMock.mockResolvedValue([
      makeOrderSummary({ id: 7 }),
      makeOrderSummary({ id: 8, order_number: 'PM-000008' }),
    ])

    const wrapper = await mountHistory()

    const links = wrapper.findAll('.track-btn')
    expect(links.map((l) => l.attributes('to'))).toEqual(['/orders/7', '/orders/8'])
  })

  it('shows a singular item count label for a single-item order', async () => {
    fetchOrdersMock.mockResolvedValue([makeOrderSummary({ item_count: 1 })])

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('1 ITEM')
    expect(wrapper.text()).not.toContain('1 ITEMS')
  })

  it('shows an empty state with a link to browse products when there are no orders', async () => {
    fetchOrdersMock.mockResolvedValue([])

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain("You haven't placed any orders yet.")
    expect(wrapper.text()).toContain('0 Orders')
    expect(wrapper.find('.view-all-link').attributes('to')).toBe('/products')
  })

  it('shows an error state when fetching orders fails', async () => {
    fetchOrdersMock.mockRejectedValue(new Error('network error'))

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain("We couldn't load your orders.")
  })

  it('shows an error state when there is no session, without calling fetchOrders', async () => {
    mockSession = null

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain("We couldn't load your orders.")
    expect(fetchOrdersMock).not.toHaveBeenCalled()
  })
})
