import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { Product } from '@/lib/products'

const fetchProductBySlugMock = vi.fn()
const fetchRelatedProductsMock = vi.fn()
vi.mock('@/lib/products', () => ({
  fetchProductBySlug: (...args: unknown[]) => fetchProductBySlugMock(...args),
  fetchRelatedProducts: (...args: unknown[]) => fetchRelatedProductsMock(...args),
  effectivePrice: (p: { price: number; is_discounted: boolean; discount_percent: number | null }) =>
    p.is_discounted && p.discount_percent
      ? Math.round(p.price * (1 - p.discount_percent / 100) * 100) / 100
      : p.price,
}))

const fetchRecommendedProductsMock = vi.fn()
vi.mock('@/lib/recommendations', () => ({
  fetchRecommendedProducts: (...args: unknown[]) => fetchRecommendedProductsMock(...args),
}))

const fetchProductReviewsMock = vi.fn()
const createProductReviewMock = vi.fn()
vi.mock('@/lib/reviews', () => ({
  fetchProductReviews: (...args: unknown[]) => fetchProductReviewsMock(...args),
  createProductReview: (...args: unknown[]) => createProductReviewMock(...args),
  ratingSummary: (reviews: { rating: number }[]) =>
    reviews.length
      ? {
          average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
          count: reviews.length,
        }
      : { average: 0, count: 0 },
}))

let mockCustomer: { id: string } | null = null
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    get customer() {
      return mockCustomer
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

const { default: ProductDetailView } = await import('../ProductDetailView.vue')

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    category_id: 1,
    store_id: 1,
    slug: 'product-1',
    name: 'Product 1',
    brand: 'Acme',
    species: 'Dog',
    price: 20,
    stock: 5,
    images: [],
    description: 'A great product.',
    is_new: false,
    is_promotional: false,
    promotion_note: null,
    is_discounted: false,
    discount_percent: null,
    created_at: '2026-01-01T00:00:00Z',
    categories: { id: 1, name: 'Food', slug: 'food' },
    stores: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockCustomer = null
  fetchRelatedProductsMock.mockResolvedValue([])
  fetchRecommendedProductsMock.mockResolvedValue({ products: [], personalized: false })
  fetchProductReviewsMock.mockResolvedValue([])
})

async function mountDetail(slug = 'product-1') {
  const wrapper = mount(ProductDetailView, { props: { slug } })
  await flushPromises()
  return wrapper
}

describe('ProductDetailView', () => {
  it('shows a not-found message when the product does not exist', async () => {
    fetchProductBySlugMock.mockResolvedValue(null)

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain("We couldn't find that product.")
  })

  describe('images', () => {
    it('renders real gallery tiles from the product images', async () => {
      fetchProductBySlugMock.mockResolvedValue(
        makeProduct({ images: ['/fixtures/1.jpg', '/fixtures/2.jpg'] }),
      )

      const wrapper = await mountDetail()
      const galleryImages = wrapper.findAll('.gallery-image')

      expect(galleryImages).toHaveLength(2)
      expect(galleryImages[0].classes()).not.toContain('placeholder-img')
      expect(galleryImages[0].attributes('style')).toContain('/fixtures/1.jpg')
    })

    it('shows 4 placeholder tiles when the product has no images', async () => {
      fetchProductBySlugMock.mockResolvedValue(makeProduct({ images: [] }))

      const wrapper = await mountDetail()
      const galleryImages = wrapper.findAll('.gallery-image')

      expect(galleryImages).toHaveLength(4)
      galleryImages.forEach((img) => expect(img.classes()).toContain('placeholder-img'))
    })
  })

  describe('stock availability', () => {
    it('shows in-stock state and an enabled add-to-cart button', async () => {
      fetchProductBySlugMock.mockResolvedValue(makeProduct({ stock: 5 }))

      const wrapper = await mountDetail()

      expect(wrapper.find('.stock-status').text()).toBe('5 in stock')
      expect(wrapper.find('.stock-status').classes()).not.toContain('is-out')
      const addBtn = wrapper.find('.add-to-cart-btn')
      expect(addBtn.text()).toBe('ADD TO CART')
      expect(addBtn.attributes('disabled')).toBeUndefined()
    })

    it('shows out-of-stock state and disables add-to-cart and the quantity increment', async () => {
      fetchProductBySlugMock.mockResolvedValue(makeProduct({ stock: 0 }))

      const wrapper = await mountDetail()

      expect(wrapper.find('.stock-status').text()).toBe('Out of stock')
      expect(wrapper.find('.stock-status').classes()).toContain('is-out')
      const addBtn = wrapper.find('.add-to-cart-btn')
      expect(addBtn.text()).toBe('OUT OF STOCK')
      expect(addBtn.attributes('disabled')).toBeDefined()
      expect(wrapper.find('.qty-btn:last-of-type').attributes('disabled')).toBeDefined()
    })
  })

  describe('related products', () => {
    it('renders the related products section when related products exist', async () => {
      fetchProductBySlugMock.mockResolvedValue(makeProduct())
      fetchRelatedProductsMock.mockResolvedValue([
        makeProduct({ id: 2, name: 'Related A', slug: 'related-a' }),
        makeProduct({ id: 3, name: 'Related B', slug: 'related-b' }),
      ])

      const wrapper = await mountDetail()

      expect(wrapper.text()).toContain('Related Products')
      expect(wrapper.findAll('.related-name').map((n) => n.text())).toEqual(['Related A', 'Related B'])
      expect(fetchRelatedProductsMock).toHaveBeenCalledWith(1, 1)
    })

    it('omits the related section entirely when there are no related products', async () => {
      fetchProductBySlugMock.mockResolvedValue(makeProduct())
      fetchRelatedProductsMock.mockResolvedValue([])

      const wrapper = await mountDetail()

      expect(wrapper.text()).not.toContain('Related Products')
    })
  })

  describe('recommended products', () => {
    it('shows the recommended section for a signed-in customer with a personalized result', async () => {
      mockCustomer = { id: 'cust-1' }
      fetchProductBySlugMock.mockResolvedValue(makeProduct())
      fetchRecommendedProductsMock.mockResolvedValue({
        products: [makeProduct({ id: 4, name: 'Picked For You', slug: 'picked' })],
        personalized: true,
      })

      const wrapper = await mountDetail()

      expect(wrapper.text()).toContain('Recommended For You')
      expect(wrapper.text()).toContain('Picked For You')
      expect(fetchRecommendedProductsMock).toHaveBeenCalledWith('cust-1', {
        excludeProductId: 1,
        limit: 4,
      })
    })

    it('hides the recommended section for a guest, even when fallback products were returned', async () => {
      mockCustomer = null
      fetchProductBySlugMock.mockResolvedValue(makeProduct())
      fetchRecommendedProductsMock.mockResolvedValue({
        products: [makeProduct({ id: 5, name: 'Newest Arrival', slug: 'newest' })],
        personalized: false,
      })

      const wrapper = await mountDetail()

      expect(wrapper.text()).not.toContain('Recommended For You')
      expect(fetchRecommendedProductsMock).toHaveBeenCalledWith(null, {
        excludeProductId: 1,
        limit: 4,
      })
    })

    it('hides the recommended section for a signed-in customer with no scoring signal (unranked fallback)', async () => {
      mockCustomer = { id: 'cust-1' }
      fetchProductBySlugMock.mockResolvedValue(makeProduct())
      fetchRecommendedProductsMock.mockResolvedValue({
        products: [makeProduct({ id: 6, name: 'Unranked Pick', slug: 'unranked' })],
        personalized: false,
      })

      const wrapper = await mountDetail()

      expect(wrapper.text()).not.toContain('Recommended For You')
    })
  })
})
