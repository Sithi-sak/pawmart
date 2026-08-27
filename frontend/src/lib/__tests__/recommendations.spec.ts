import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/lib/products'

const fetchProductsMock = vi.fn()
vi.mock('@/lib/products', () => ({
  fetchProducts: (...args: unknown[]) => fetchProductsMock(...args),
}))

// pet_profiles / order_items are both queried as `.select(...).eq(...)`,
// awaited directly with no `.single()`/`.maybeSingle()` -- so `eq()` itself
// must return the resolved { data, error } for the await to work.
function queryResult(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error })
  return { select: vi.fn(() => ({ eq: vi.fn(() => result) })) }
}

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}))

const { fetchRecommendedProducts } = await import('../recommendations')

let nextId = 1
function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? nextId++
  return {
    id,
    category_id: null,
    store_id: 1,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: 'Acme',
    species: null,
    price: 10,
    stock: 5,
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
  vi.resetAllMocks()
  nextId = 1
})

describe('guest fallback (no customerId)', () => {
  it('returns in-stock products excluding the current one, without querying pets/purchases', async () => {
    const keep = makeProduct({ stock: 5 })
    const outOfStock = makeProduct({ stock: 0 })
    const current = makeProduct({ stock: 3 })
    fetchProductsMock.mockResolvedValue([keep, outOfStock, current])

    const result = await fetchRecommendedProducts(null, { excludeProductId: current.id })

    expect(result.personalized).toBe(false)
    expect(result.products.map((p) => p.id)).toEqual([keep.id])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('respects the limit', async () => {
    const products = Array.from({ length: 5 }, () => makeProduct())
    fetchProductsMock.mockResolvedValue(products)

    const result = await fetchRecommendedProducts(null, { limit: 2 })

    expect(result.products).toHaveLength(2)
  })
})

describe('signed-in customer with no scoring signal', () => {
  it('falls back to the unranked in-stock pool and reports personalized: false', async () => {
    const only = makeProduct({ species: 'Dog', is_new: false })
    fetchProductsMock.mockResolvedValue([only])
    fromMock.mockReturnValueOnce(queryResult([])).mockReturnValueOnce(queryResult([]))

    const result = await fetchRecommendedProducts('cust-1')

    expect(result.personalized).toBe(false)
    expect(result.products.map((p) => p.id)).toEqual([only.id])
  })
})

describe('signed-in customer with a scoring signal', () => {
  it('ranks a pet-species match above a newer non-matching product and reports personalized: true', async () => {
    const dogFood = makeProduct({ species: 'Dog', created_at: '2026-01-01T00:00:00Z' })
    const catFood = makeProduct({ species: 'Cat', created_at: '2026-01-05T00:00:00Z' })
    fetchProductsMock.mockResolvedValue([catFood, dogFood])
    fromMock
      .mockReturnValueOnce(queryResult([{ species: 'Dog' }]))
      .mockReturnValueOnce(queryResult([]))

    const result = await fetchRecommendedProducts('cust-1')

    expect(result.personalized).toBe(true)
    expect(result.products[0].id).toBe(dogFood.id)
  })

  it('re-ranks the top pick when the pet species backing the score changes', async () => {
    const dogFood = makeProduct({ species: 'Dog', created_at: '2026-01-01T00:00:00Z' })
    const catFood = makeProduct({ species: 'Cat', created_at: '2026-01-05T00:00:00Z' })
    fetchProductsMock.mockResolvedValue([catFood, dogFood])

    fromMock.mockReturnValueOnce(queryResult([{ species: 'Dog' }])).mockReturnValueOnce(queryResult([]))
    const withDog = await fetchRecommendedProducts('cust-1')
    expect(withDog.products[0].id).toBe(dogFood.id)

    fromMock.mockReturnValueOnce(queryResult([{ species: 'Cat' }])).mockReturnValueOnce(queryResult([]))
    const withCat = await fetchRecommendedProducts('cust-1')
    expect(withCat.products[0].id).toBe(catFood.id)
  })

  it('scores category affinity from past purchases', async () => {
    const sameCategory = makeProduct({ category_id: 7 })
    const otherCategory = makeProduct({ category_id: 9 })
    fetchProductsMock.mockResolvedValue([otherCategory, sameCategory])
    fromMock
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(
        queryResult([{ product_id: 999, products: { category_id: 7 } }]),
      )

    const result = await fetchRecommendedProducts('cust-1')

    expect(result.personalized).toBe(true)
    expect(result.products[0].id).toBe(sameCategory.id)
  })

  it('excludes already-purchased products from the pool', async () => {
    const purchased = makeProduct()
    const other = makeProduct()
    fetchProductsMock.mockResolvedValue([purchased, other])
    fromMock
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(queryResult([{ product_id: purchased.id, products: null }]))

    const result = await fetchRecommendedProducts('cust-1')

    expect(result.products.map((p) => p.id)).not.toContain(purchased.id)
  })

  it('excludes the current product and out-of-stock products, same as the guest path', async () => {
    const current = makeProduct()
    const outOfStock = makeProduct({ stock: 0 })
    const inStock = makeProduct()
    fetchProductsMock.mockResolvedValue([current, outOfStock, inStock])
    fromMock.mockReturnValueOnce(queryResult([])).mockReturnValueOnce(queryResult([]))

    const result = await fetchRecommendedProducts('cust-1', { excludeProductId: current.id })

    expect(result.products.map((p) => p.id)).toEqual([inStock.id])
  })
})
