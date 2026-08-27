import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, inject, provide } from 'vue'
import type { Product } from '@/lib/products'

const fetchProductsMock = vi.fn()
const fetchCategoriesMock = vi.fn()
vi.mock('@/lib/products', () => ({
  fetchProducts: (...args: unknown[]) => fetchProductsMock(...args),
  fetchCategories: (...args: unknown[]) => fetchCategoriesMock(...args),
}))

vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
  useRouter: () => ({ push: vi.fn() }),
}))

// Minimal stand-ins for the Element Plus inputs this view uses. The real
// components pull in teleport/popper/ResizeObserver machinery that's
// unnecessary overhead here -- this view's own filter/sort logic (the thing
// under test) only cares about receiving `update:modelValue`.
const ElInputStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'stub-search',
        value: props.modelValue,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      })
  },
})

const ElSelectStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'select',
        {
          class: 'stub-sort',
          value: props.modelValue,
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value),
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

const checkboxGroupKey = Symbol('checkbox-group')

const ElCheckboxGroupStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    provide(checkboxGroupKey, {
      isChecked: (value: string) => (props.modelValue as string[]).includes(value),
      toggle: (value: string) => {
        const current = props.modelValue as string[]
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        emit('update:modelValue', next)
      },
    })
    return () => h('div', { class: 'stub-checkbox-group' }, slots.default?.())
  },
})

const ElCheckboxStub = defineComponent({
  props: ['value', 'label'],
  setup(props, { slots }) {
    const group = inject(checkboxGroupKey) as
      | { isChecked: (v: string) => boolean; toggle: (v: string) => void }
      | undefined
    return () =>
      h('label', { class: 'stub-checkbox' }, [
        h('input', {
          type: 'checkbox',
          checked: group?.isChecked(props.value as string),
          onChange: () => group?.toggle(props.value as string),
        }),
        slots.default?.(),
      ])
  },
})

const { default: ProductCatalogView } = await import('../ProductCatalogView.vue')

let nextId = 1
function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? nextId++
  return {
    id,
    category_id: 1,
    store_id: 1,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: 'Acme',
    species: 'Dog',
    price: 20,
    stock: 5,
    images: [],
    description: null,
    is_new: false,
    created_at: '2026-01-01T00:00:00Z',
    categories: { id: 1, name: 'Food', slug: 'food' },
    stores: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
})

const globalStubs = {
  global: {
    stubs: {
      ElInput: ElInputStub,
      ElSelect: ElSelectStub,
      ElOption: ElOptionStub,
      ElCheckboxGroup: ElCheckboxGroupStub,
      ElCheckbox: ElCheckboxStub,
    },
  },
}

async function mountCatalog(products: Product[]) {
  fetchProductsMock.mockResolvedValue(products)
  fetchCategoriesMock.mockResolvedValue([
    { id: 1, name: 'Food', slug: 'food' },
    { id: 2, name: 'Toys', slug: 'toys' },
  ])

  const wrapper = mount(ProductCatalogView, globalStubs)
  await flushPromises()
  return wrapper
}

function productNames(wrapper: Awaited<ReturnType<typeof mountCatalog>>) {
  return wrapper.findAll('.product-name').map((n) => n.text())
}

describe('ProductCatalogView', () => {
  it('shows all products once loaded', async () => {
    const wrapper = await mountCatalog([makeProduct(), makeProduct()])

    expect(wrapper.findAll('.product-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Showing 2 Results')
  })

  it('shows a load-error message when fetching fails', async () => {
    fetchProductsMock.mockRejectedValue(new Error('network error'))
    fetchCategoriesMock.mockResolvedValue([])

    const wrapper = mount(ProductCatalogView, globalStubs)
    await flushPromises()

    expect(wrapper.find('.empty-state').text()).toContain("Couldn't load products")
  })

  describe('filtering', () => {
    it('filters by species', async () => {
      const dog = makeProduct({ species: 'Dog', name: 'Dog Food' })
      const cat = makeProduct({ species: 'Cat', name: 'Cat Food' })
      const wrapper = await mountCatalog([dog, cat])

      const catButton = wrapper.findAll('.species-card').find((b) => b.text() === 'Cat')!
      await catButton.trigger('click')

      expect(productNames(wrapper)).toEqual(['Cat Food'])
    })

    it('toggling the same species again clears the filter', async () => {
      const dog = makeProduct({ species: 'Dog', name: 'Dog Food' })
      const cat = makeProduct({ species: 'Cat', name: 'Cat Food' })
      const wrapper = await mountCatalog([dog, cat])

      const catButton = wrapper.findAll('.species-card').find((b) => b.text() === 'Cat')!
      await catButton.trigger('click')
      await catButton.trigger('click')

      // Default sort is newest-first (highest id), and cat was created second.
      expect(productNames(wrapper)).toEqual(['Cat Food', 'Dog Food'])
    })

    it('filters by category', async () => {
      const food = makeProduct({ name: 'Kibble', categories: { id: 1, name: 'Food', slug: 'food' } })
      const toy = makeProduct({ name: 'Ball', categories: { id: 2, name: 'Toys', slug: 'toys' } })
      const wrapper = await mountCatalog([food, toy])

      const toysItem = wrapper.findAll('.category-list li').find((li) => li.text() === 'TOYS')!
      await toysItem.trigger('click')

      expect(productNames(wrapper)).toEqual(['Ball'])
    })

    it('filters by search query across name and brand', async () => {
      const a = makeProduct({ name: 'Salmon Treats', brand: 'Acme' })
      const b = makeProduct({ name: 'Chew Toy', brand: 'PetCo' })
      const wrapper = await mountCatalog([a, b])

      await wrapper.find('.stub-search').setValue('salmon')

      expect(productNames(wrapper)).toEqual(['Salmon Treats'])
    })

    it('matches search query against brand even when the name differs', async () => {
      const a = makeProduct({ name: 'Chew Toy', brand: 'PetCo' })
      const b = makeProduct({ name: 'Cat Tower', brand: 'Whiskers Inc' })
      const wrapper = await mountCatalog([a, b])

      await wrapper.find('.stub-search').setValue('whiskers')

      expect(productNames(wrapper)).toEqual(['Cat Tower'])
    })

    it('filters by price range', async () => {
      const cheap = makeProduct({ name: 'Cheap', price: 10 })
      const pricey = makeProduct({ name: 'Pricey', price: 200 })
      const wrapper = await mountCatalog([cheap, pricey])

      const priceGroup = wrapper.findAll('.stub-checkbox-group')[0]
      const label = priceGroup.findAll('.stub-checkbox').find((l) => l.text().includes('$0'))!
      await label.find('input').setValue(true)

      expect(productNames(wrapper)).toEqual(['Cheap'])
    })

    it('filters by brand', async () => {
      const acme = makeProduct({ name: 'Acme Bowl', brand: 'Acme' })
      const petco = makeProduct({ name: 'PetCo Bowl', brand: 'PetCo' })
      const wrapper = await mountCatalog([acme, petco])

      const brandGroup = wrapper.findAll('.stub-checkbox-group')[1]
      const acmeLabel = brandGroup.findAll('.stub-checkbox').find((l) => l.text() === 'Acme')!
      await acmeLabel.find('input').setValue(true)

      expect(productNames(wrapper)).toEqual(['Acme Bowl'])
    })

    it('combines multiple active filters', async () => {
      const match = makeProduct({ name: 'Dog Kibble', species: 'Dog', brand: 'Acme', price: 20 })
      const wrongSpecies = makeProduct({ name: 'Cat Kibble', species: 'Cat', brand: 'Acme', price: 20 })
      const wrongBrand = makeProduct({ name: 'Dog Kibble 2', species: 'Dog', brand: 'PetCo', price: 20 })
      const wrapper = await mountCatalog([match, wrongSpecies, wrongBrand])

      const dogButton = wrapper.findAll('.species-card').find((b) => b.text() === 'Dog')!
      await dogButton.trigger('click')

      const brandGroup = wrapper.findAll('.stub-checkbox-group')[1]
      const acmeLabel = brandGroup.findAll('.stub-checkbox').find((l) => l.text() === 'Acme')!
      await acmeLabel.find('input').setValue(true)

      expect(productNames(wrapper)).toEqual(['Dog Kibble'])
    })

    it('shows an empty-result message when filters match nothing', async () => {
      const wrapper = await mountCatalog([makeProduct({ name: 'Only Product' })])

      await wrapper.find('.stub-search').setValue('nonexistent-query-xyz')

      expect(wrapper.find('.empty-state').text()).toContain('No products match your filters.')
      expect(wrapper.findAll('.product-card')).toHaveLength(0)
    })

    it('shows the empty state when the catalog itself has no products', async () => {
      const wrapper = await mountCatalog([])

      expect(wrapper.find('.empty-state').text()).toContain('No products match your filters.')
    })
  })

  describe('sorting', () => {
    it('sorts by price ascending and descending', async () => {
      const banana = makeProduct({ name: 'Banana Treats', price: 30 })
      const apple = makeProduct({ name: 'Apple Treats', price: 10 })
      const wrapper = await mountCatalog([banana, apple])

      const select = wrapper.find('.stub-sort')
      await select.setValue('price-asc')
      expect(productNames(wrapper)).toEqual(['Apple Treats', 'Banana Treats'])

      await select.setValue('price-desc')
      expect(productNames(wrapper)).toEqual(['Banana Treats', 'Apple Treats'])
    })

    it('sorts by name A-Z', async () => {
      const banana = makeProduct({ name: 'Banana Treats' })
      const apple = makeProduct({ name: 'Apple Treats' })
      const wrapper = await mountCatalog([banana, apple])

      await wrapper.find('.stub-sort').setValue('name')

      expect(productNames(wrapper)).toEqual(['Apple Treats', 'Banana Treats'])
    })

    it('sorts by newest (highest id) by default', async () => {
      const older = makeProduct({ name: 'Older' })
      const newer = makeProduct({ name: 'Newer' })
      const wrapper = await mountCatalog([older, newer])

      expect(productNames(wrapper)).toEqual(['Newer', 'Older'])
    })
  })

  describe('pagination', () => {
    it('resets to page 1 when a filter changes on a later page', async () => {
      const products = Array.from({ length: 8 }, () => makeProduct())
      const wrapper = await mountCatalog(products)

      const nextBtn = wrapper.findAll('.page-btn')[1]
      await nextBtn.trigger('click')
      expect(wrapper.find('.page-indicator').text()).toBe('02 / 02')

      await wrapper.find('.stub-search').setValue(products[0].name)
      expect(wrapper.find('.page-indicator').text()).toBe('01 / 01')
    })
  })
})
