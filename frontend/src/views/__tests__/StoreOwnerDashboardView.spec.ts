import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
import type { DashboardStats } from '@/lib/adminDashboard'
import type { Product } from '@/lib/products'

const fetchDashboardStatsMock = vi.fn()
vi.mock('@/lib/adminDashboard', () => ({
  fetchDashboardStats: (...args: unknown[]) => fetchDashboardStatsMock(...args),
}))

const fetchProductsMock = vi.fn()
vi.mock('@/lib/products', () => ({
  LOW_STOCK_THRESHOLD: 10,
  fetchProducts: (...args: unknown[]) => fetchProductsMock(...args),
  isLowStock: (p: { stock: number }) => p.stock <= 10,
}))

const fetchStoreByOwnerIdMock = vi.fn()
const updateStoreMock = vi.fn()
vi.mock('@/lib/stores', () => ({
  fetchStoreByOwnerId: (...args: unknown[]) => fetchStoreByOwnerIdMock(...args),
  updateStore: (...args: unknown[]) => updateStoreMock(...args),
}))

const authInitMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ init: authInitMock, customer: { id: 'owner-1' } }),
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

const { default: StoreOwnerDashboardView } = await import('../store/StoreOwnerDashboardView.vue')

const STORE = {
  id: 10,
  owner_id: 'owner-1',
  name: 'Acme Store',
  slug: 'acme-store',
  description: null,
  logo_url: null,
  status: 'active' as const,
  created_at: '2026-01-01T00:00:00Z',
}

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    revenueThisMonth: 500,
    revenueLastMonth: 400,
    ordersThisMonth: 5,
    ordersLastMonth: 4,
    newCustomersThisMonth: 0,
    newCustomersThisWeek: 0,
    avgOrderValueThisMonth: 100,
    avgOrderValueLastMonth: 100,
    ...overrides,
  }
}

let nextId = 1
function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? nextId++
  return {
    id,
    category_id: null,
    store_id: 10,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: 'Acme',
    species: 'Dog',
    price: 10,
    stock: 20,
    images: [],
    description: null,
    is_new: false,
    created_at: '2026-01-01T00:00:00Z',
    categories: null,
    stores: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
  fetchStoreByOwnerIdMock.mockResolvedValue(STORE)
})

async function mountView(stats: DashboardStats, products: Product[] = []) {
  fetchDashboardStatsMock.mockResolvedValue(stats)
  fetchProductsMock.mockResolvedValue(products)
  const wrapper = mount(StoreOwnerDashboardView, {
    attachTo: document.body,
    global: { plugins: [ElementPlus] },
  })
  await flushPromises()
  await nextTick()
  await nextTick()
  return wrapper
}

describe('StoreOwnerDashboardView', () => {
  it('renders the sales overview stats', async () => {
    const wrapper = await mountView(makeStats({ revenueThisMonth: 500, ordersThisMonth: 5, avgOrderValueThisMonth: 100 }))

    expect(wrapper.text()).toContain('$500.00')
    expect(wrapper.text()).toContain('Orders This Month')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('$100.00')
  })

  it('lists only products at or below the low-stock threshold, lowest first', async () => {
    const critical = makeProduct({ name: 'Almost Gone', stock: 2 })
    const low = makeProduct({ name: 'Getting Low', stock: 8 })
    const plenty = makeProduct({ name: 'Well Stocked', stock: 50 })
    const wrapper = await mountView(makeStats(), [plenty, low, critical])

    const widget = wrapper.find('.widget-card')
    const text = widget.text()
    expect(text).toContain('Almost Gone')
    expect(text).toContain('Getting Low')
    expect(text).not.toContain('Well Stocked')

    const rowOrder = [...text.matchAll(/Almost Gone|Getting Low/g)].map((m) => m[0])
    expect(rowOrder).toEqual(['Almost Gone', 'Getting Low'])
  })

  it('shows the empty-state message when nothing is low on stock', async () => {
    const wrapper = await mountView(makeStats(), [makeProduct({ stock: 50 })])

    expect(wrapper.text()).toContain('No low-stock products right now.')
  })

  it('shows an error state when loading fails', async () => {
    fetchStoreByOwnerIdMock.mockRejectedValue(new Error('boom'))
    const wrapper = mount(StoreOwnerDashboardView, {
      attachTo: document.body,
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain("Couldn't load dashboard data")
  })

  describe('store profile', () => {
    it('saves profile changes', async () => {
      updateStoreMock.mockResolvedValue({ ...STORE, description: 'New desc', logo_url: 'https://x/logo.png' })
      const wrapper = await mountView(makeStats())

      await wrapper.find('#s-description').setValue('New desc')
      await wrapper.find('#s-logo').setValue('https://x/logo.png')
      await wrapper.find('.profile-form').trigger('submit')
      await flushPromises()

      expect(updateStoreMock).toHaveBeenCalledWith(10, {
        description: 'New desc',
        logo_url: 'https://x/logo.png',
      })
      expect(elMessageSuccessMock).toHaveBeenCalled()
    })

    it('shows an error when saving the profile fails', async () => {
      updateStoreMock.mockRejectedValue(new Error('boom'))
      const wrapper = await mountView(makeStats())

      await wrapper.find('#s-description').setValue('New desc')
      await wrapper.find('.profile-form').trigger('submit')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
    })
  })
})
