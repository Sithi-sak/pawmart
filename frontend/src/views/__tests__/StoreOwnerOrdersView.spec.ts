import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import type { OrderStatus, OrderSummary } from '@/lib/orders'

const fetchOrdersMock = vi.fn()
const updateOrderStatusMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  fetchOrders: (...args: unknown[]) => fetchOrdersMock(...args),
  updateOrderStatus: (...args: unknown[]) => updateOrderStatusMock(...args),
}))

const authInitMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ init: authInitMock, session: { access_token: 'tok-1' } }),
}))

const elMessageSuccessMock = vi.fn()
const elMessageErrorMock = vi.fn()
vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: (...args: unknown[]) => elMessageSuccessMock(...args),
      error: (...args: unknown[]) => elMessageErrorMock(...args),
    },
  }
})

// This view drives el-select with a one-way `:model-value` + `@change`
// (not v-model), unlike the ElSelectStub used elsewhere -- mirror that
// shape rather than reusing the update:modelValue variant.
const ElSelectStub = defineComponent({
  props: ['modelValue', 'disabled'],
  emits: ['change'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'select',
        {
          value: props.modelValue,
          disabled: props.disabled,
          onChange: (e: Event) => emit('change', (e.target as HTMLSelectElement).value),
        },
        slots.default?.(),
      )
  },
})
const ElOptionStub = defineComponent({
  props: ['value', 'label'],
  setup(props) {
    return () => h('option', { value: props.value }, props.label)
  },
})

const { default: StoreOwnerOrdersView } = await import('../store/StoreOwnerOrdersView.vue')

let nextId = 1
function makeOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  const id = overrides.id ?? nextId++
  return {
    id,
    order_number: `PM-00000${id}`,
    status: 'confirmed' as OrderStatus,
    total: 42,
    created_at: '2026-01-01T00:00:00Z',
    item_count: 2,
    payment_method: 'visa',
    payment_status: 'paid',
    customer: { id: 'cust-1', full_name: 'Jane Doe', email: 'jane@x.com' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
})

async function mountView(orders: OrderSummary[] = []) {
  fetchOrdersMock.mockResolvedValue(orders)
  const wrapper = mount(StoreOwnerOrdersView, {
    attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      stubs: { ElSelect: ElSelectStub, ElOption: ElOptionStub },
    },
  })
  await flushPromises()
  await nextTick()
  await nextTick()
  return wrapper
}

describe('StoreOwnerOrdersView', () => {
  it('renders the order list', async () => {
    const wrapper = await mountView([makeOrder({ order_number: 'PM-000001' })])

    expect(wrapper.text()).toContain('PM-000001')
    expect(wrapper.text()).toContain('Jane Doe')
  })

  it('shows an error state when loading fails', async () => {
    fetchOrdersMock.mockRejectedValue(new Error('boom'))
    const wrapper = mount(StoreOwnerOrdersView, {
      attachTo: document.body,
      global: { plugins: [ElementPlus], stubs: { ElSelect: ElSelectStub, ElOption: ElOptionStub } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain("Couldn't load orders")
  })

  describe('status transitions', () => {
    it('offers every forward status but neither the current nor any past status', async () => {
      const wrapper = await mountView([makeOrder({ status: 'processing' })])

      const values = wrapper.find('select').findAll('option').map((o) => o.element.value)

      expect(values).toEqual(['processing', 'shipping', 'out_for_delivery', 'delivered'])
      expect(values).not.toContain('confirmed')
    })

    it('disables the dropdown once an order is delivered -- there is nowhere forward left to go', async () => {
      const wrapper = await mountView([makeOrder({ status: 'delivered' })])

      const select = wrapper.find('select')
      expect(select.findAll('option').map((o) => o.element.value)).toEqual(['delivered'])
      expect(select.attributes('disabled')).toBeDefined()
    })

    it('advances an order status, updates it locally, and shows a success message', async () => {
      const order = makeOrder({ id: 7, order_number: 'PM-000007', status: 'confirmed' })
      updateOrderStatusMock.mockResolvedValue({ ...order, status: 'shipping' })
      const wrapper = await mountView([order])

      await wrapper.find('select').setValue('shipping')
      await flushPromises()

      expect(updateOrderStatusMock).toHaveBeenCalledWith(7, 'shipping', 'tok-1')
      expect(elMessageSuccessMock).toHaveBeenCalled()
    })

    it('shows an error and leaves the status unchanged when the update request fails', async () => {
      const order = makeOrder({ id: 7, status: 'confirmed' })
      updateOrderStatusMock.mockRejectedValue(new Error('boom'))
      const wrapper = await mountView([order])

      await wrapper.find('select').setValue('shipping')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
      expect(wrapper.find('select').element.value).toBe('confirmed')
    })

    it('lets the store owner jump straight to a later status, skipping intermediate ones in a single change', async () => {
      // Checkpoint 5.7 says "can't skip/go backward" but the dropdown itself
      // offers every remaining status (see the option-list test above), so
      // skipping ahead in one hop is the intended UI, not a bug -- matches
      // the backend's update_order_status, which only rejects new_index <=
      // current_index.
      const order = makeOrder({ id: 3, status: 'confirmed' })
      updateOrderStatusMock.mockResolvedValue({ ...order, status: 'delivered' })
      const wrapper = await mountView([order])

      await wrapper.find('select').setValue('delivered')
      await flushPromises()

      expect(updateOrderStatusMock).toHaveBeenCalledWith(3, 'delivered', 'tok-1')
    })
  })
})
