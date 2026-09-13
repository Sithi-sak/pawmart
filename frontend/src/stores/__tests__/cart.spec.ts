import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Product } from '@/lib/products'
import type { AvailableRedemption } from '@/lib/loyalty'

// Stand-in for supabase-js's PostgrestFilterBuilder -- cart.ts never calls
// .single()/.maybeSingle(), it awaits the builder chain directly (see
// auth.spec.ts's queryResult for the single()-based variant). Built on a
// real Promise (rather than a plain object with its own `then`) so it's
// legitimately awaitable without tripping unicorn/no-thenable.
function queryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = Promise.resolve(result) as Promise<typeof result> & {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
  }
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.upsert = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  return builder
}

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}))

let mockCustomer: { id: string } | null = { id: 'cust-1' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get customer() {
      return mockCustomer
    },
    initialized: true,
  }),
}))

const { useCartStore } = await import('../cart')

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    category_id: 1,
    store_id: 10,
    slug: 'product-1',
    name: 'Product 1',
    brand: 'Acme',
    species: 'Dog',
    price: 10,
    stock: 5,
    images: [],
    description: null,
    is_new: false,
    is_promotional: false,
    promotion_note: null,
    is_discounted: false,
    discount_percent: null,
    created_at: '2026-01-01T00:00:00Z',
    categories: { id: 1, name: 'Food', slug: 'food' },
    stores: { id: 10, name: 'Acme Shop', slug: 'acme-shop' },
    ...overrides,
  }
}

function makeRedemption(
  overrides: { discountAmount?: number | null; freeShipping?: boolean } = {},
): AvailableRedemption {
  return {
    id: 1,
    reward: {
      id: 1,
      title: '$10 Off Your Order',
      discount_amount: 'discountAmount' in overrides ? overrides.discountAmount! : 10,
      free_shipping: overrides.freeShipping ?? false,
    },
  }
}

let builder: ReturnType<typeof queryBuilder>

beforeEach(async () => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockCustomer = { id: 'cust-1' }
  builder = queryBuilder({ data: [], error: null })
  fromMock.mockReturnValue(builder)
})

async function makeStore() {
  const store = useCartStore()
  await flushPromises()
  return store
}

describe('cart store', () => {
  describe('quantity edit', () => {
    it('increments an item and persists the new quantity', async () => {
      const store = await makeStore()
      store.addItem(makeProduct(), 1)
      const item = store.items[0]

      store.increment(item)

      expect(item.quantity).toBe(2)
      expect(builder.upsert).toHaveBeenCalledWith(
        { customer_id: 'cust-1', product_id: 1, quantity: 2 },
        { onConflict: 'customer_id,product_id' },
      )
    })

    it('decrements an item and persists the new quantity', async () => {
      const store = await makeStore()
      store.addItem(makeProduct(), 2)
      const item = store.items[0]

      store.decrement(item)

      expect(item.quantity).toBe(1)
      expect(builder.upsert).toHaveBeenCalledWith(
        { customer_id: 'cust-1', product_id: 1, quantity: 1 },
        { onConflict: 'customer_id,product_id' },
      )
    })

    it('will not decrement below a quantity of 1', async () => {
      const store = await makeStore()
      store.addItem(makeProduct(), 1)
      const item = store.items[0]
      builder.upsert.mockClear() // clear addItem's own persist call

      store.decrement(item)

      expect(item.quantity).toBe(1)
      expect(builder.upsert).not.toHaveBeenCalled()
    })

    it('adding the same product again increases its existing line quantity', async () => {
      const store = await makeStore()
      store.addItem(makeProduct(), 1)
      store.addItem(makeProduct(), 2)

      expect(store.items).toHaveLength(1)
      expect(store.items[0].quantity).toBe(3)
    })
  })

  describe('remove', () => {
    it('removes an item from the cart and persists the removal', async () => {
      const store = await makeStore()
      store.addItem(makeProduct({ id: 1 }))
      store.addItem(makeProduct({ id: 2, slug: 'product-2' }))

      store.removeItem(1)

      expect(store.items.map((i) => i.productId)).toEqual([2])
      expect(builder.delete).toHaveBeenCalled()
      expect(builder.eq).toHaveBeenCalledWith('product_id', 1)
    })

    it('clear empties the cart and removes the applied redemption', async () => {
      const store = await makeStore()
      store.addItem(makeProduct())
      store.applyRedemption(makeRedemption())

      store.clear()

      expect(store.items).toHaveLength(0)
      expect(store.appliedRedemption).toBeNull()
    })
  })

  describe('redemption', () => {
    it('applies a redemption and computes the discount', async () => {
      const store = await makeStore()
      store.addItem(makeProduct({ price: 100 }), 2)
      const redemption = makeRedemption({ discountAmount: 10 })

      store.applyRedemption(redemption)

      expect(store.appliedRedemption).toEqual(redemption)
      expect(store.discount).toBe(10)
      expect(store.total).toBe(190)
    })

    it('caps the discount at the cart subtotal', async () => {
      const store = await makeStore()
      store.addItem(makeProduct({ price: 20 }), 1)

      store.applyRedemption(makeRedemption({ discountAmount: 25 }))

      expect(store.discount).toBe(20)
      expect(store.total).toBe(0)
    })

    it('a free-shipping redemption contributes no cart discount', async () => {
      const store = await makeStore()
      store.addItem(makeProduct({ price: 100 }))

      store.applyRedemption(makeRedemption({ discountAmount: null, freeShipping: true }))

      expect(store.discount).toBe(0)
      expect(store.appliedRedemption?.reward.free_shipping).toBe(true)
    })

    it('removeRedemption clears the applied redemption', async () => {
      const store = await makeStore()
      store.addItem(makeProduct({ price: 100 }))
      store.applyRedemption(makeRedemption())

      store.removeRedemption()

      expect(store.appliedRedemption).toBeNull()
      expect(store.discount).toBe(0)
    })
  })
})
