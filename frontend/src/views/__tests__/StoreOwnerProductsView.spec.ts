import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import type { Product } from '@/lib/products'

const fetchProductsMock = vi.fn()
const fetchCategoriesMock = vi.fn()
const createProductMock = vi.fn()
const updateProductMock = vi.fn()
const deleteProductMock = vi.fn()
vi.mock('@/lib/products', () => ({
  fetchProducts: (...args: unknown[]) => fetchProductsMock(...args),
  fetchCategories: (...args: unknown[]) => fetchCategoriesMock(...args),
  createProduct: (...args: unknown[]) => createProductMock(...args),
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
  deleteProduct: (...args: unknown[]) => deleteProductMock(...args),
  isLowStock: (p: { stock: number }) => p.stock <= 10,
}))

const fetchStoreByOwnerIdMock = vi.fn()
vi.mock('@/lib/stores', () => ({
  fetchStoreByOwnerId: (...args: unknown[]) => fetchStoreByOwnerIdMock(...args),
}))

const uploadProductImageMock = vi.fn()
vi.mock('@/lib/storage', () => ({
  uploadProductImage: (...args: unknown[]) => uploadProductImageMock(...args),
}))

const authInitMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    init: authInitMock,
    customer: { id: 'owner-1' },
    session: { access_token: 'tok-1' },
  }),
}))

const elMessageWarningMock = vi.fn()
const elMessageSuccessMock = vi.fn()
const elMessageErrorMock = vi.fn()
const elMessageBoxConfirmMock = vi.fn()
vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      warning: (...args: unknown[]) => elMessageWarningMock(...args),
      success: (...args: unknown[]) => elMessageSuccessMock(...args),
      error: (...args: unknown[]) => elMessageErrorMock(...args),
    },
    ElMessageBox: { confirm: (...args: unknown[]) => elMessageBoxConfirmMock(...args) },
  }
})

// Real el-select pulls in teleport/popper machinery that's irrelevant here
// (same reasoning as PetProfilesView.spec.ts) -- minimal modelValue stand-in.
const ElSelectStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'select',
        {
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

// Renders its slot inline whenever open, same pattern as CheckoutView.spec.ts's
// KHQR modal stub -- the real el-dialog teleports and isn't worth driving here.
const ElDialogStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'el-dialog-stub' }, slots.default?.()) : null)
  },
})

// Minimal file-list v-model stand-in -- tests drive it by emitting
// update:fileList directly rather than simulating a real file picker.
const ElUploadStub = defineComponent({
  props: ['fileList'],
  emits: ['update:fileList'],
  setup(_props, { slots }) {
    return () => h('div', { class: 'upload-stub' }, slots.default?.())
  },
})

const { default: StoreOwnerProductsView } = await import('../store/StoreOwnerProductsView.vue')

let nextId = 1
function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? nextId++
  return {
    id,
    category_id: 1,
    store_id: 10,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: 'Acme',
    species: 'Dog',
    price: 10,
    stock: 20,
    images: ['https://cdn/existing.jpg'],
    description: null,
    is_new: false,
    is_promotional: false,
    promotion_note: null,
    is_discounted: false,
    discount_percent: null,
    created_at: '2026-01-01T00:00:00Z',
    categories: null,
    stores: null,
    ...overrides,
  }
}

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

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
  fetchStoreByOwnerIdMock.mockResolvedValue(STORE)
  fetchCategoriesMock.mockResolvedValue([])
})

async function mountView(products: Product[] = []) {
  fetchProductsMock.mockResolvedValue(products)
  const wrapper = mount(StoreOwnerProductsView, {
    attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      stubs: {
        ElSelect: ElSelectStub,
        ElOption: ElOptionStub,
        ElDialog: ElDialogStub,
        ElUpload: ElUploadStub,
      },
    },
  })
  await flushPromises()
  // el-table renders its rows asynchronously off a ResizeObserver-driven
  // layout pass -- one flush isn't enough (confirmed against a minimal
  // el-table probe under happy-dom).
  await nextTick()
  await nextTick()
  return wrapper
}

async function openAddDialog(wrapper: Awaited<ReturnType<typeof mountView>>) {
  await wrapper.find('.add-btn').trigger('click')
  await nextTick()
}

describe('StoreOwnerProductsView', () => {
  it('renders products with the correct stock status badge for each', async () => {
    const inStock = makeProduct({ name: 'Kibble', stock: 50 })
    const low = makeProduct({ name: 'Leash', stock: 5 })
    const out = makeProduct({ name: 'Bed', stock: 0 })
    const wrapper = await mountView([inStock, low, out])

    const text = wrapper.text()
    expect(text).toContain('Kibble')
    expect(text).toContain('Leash')
    expect(text).toContain('Bed')
    expect(text).toContain('In Stock')
    expect(text).toContain('Low Stock')
    expect(text).toContain('Out of Stock')
  })

  it('shows an error state when loading fails', async () => {
    fetchStoreByOwnerIdMock.mockRejectedValue(new Error('boom'))
    const wrapper = mount(StoreOwnerProductsView, {
      attachTo: document.body,
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElSelect: ElSelectStub,
          ElOption: ElOptionStub,
          ElDialog: ElDialogStub,
          ElUpload: ElUploadStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain("Couldn't load products")
  })

  describe('create', () => {
    it('uploads a new image and creates the product with the returned url', async () => {
      uploadProductImageMock.mockResolvedValue({ path: 'x.jpg', url: 'https://cdn/x.jpg' })
      const created = makeProduct({ id: 99, name: 'New Toy', price: 9.99, stock: 20 })
      createProductMock.mockResolvedValue(created)
      const wrapper = await mountView([])

      await openAddDialog(wrapper)
      const rawFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
      await wrapper
        .findComponent(ElUploadStub)
        .vm.$emit('update:fileList', [{ name: 'photo.jpg', raw: rawFile }])
      await wrapper.find('#p-name').setValue('New Toy')
      await wrapper.find('#p-price').setValue(9.99)
      await wrapper.find('#p-stock').setValue(20)
      await wrapper.find('.product-form').trigger('submit')
      await flushPromises()

      expect(uploadProductImageMock).toHaveBeenCalledWith(rawFile, 'tok-1')
      expect(createProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Toy',
          price: 9.99,
          stock: 20,
          images: ['https://cdn/x.jpg'],
          store_id: 10,
        }),
      )
      expect(wrapper.text()).toContain('New Toy')
    })

    it('requires at least one image before saving', async () => {
      const wrapper = await mountView([])

      await openAddDialog(wrapper)
      await wrapper.find('#p-name').setValue('New Toy')
      await wrapper.find('#p-price').setValue(9.99)
      await wrapper.find('#p-stock').setValue(20)
      await wrapper.find('.product-form').trigger('submit')
      await flushPromises()

      expect(elMessageWarningMock).toHaveBeenCalled()
      expect(createProductMock).not.toHaveBeenCalled()
    })

    it('requires name, price, and stock before saving', async () => {
      const wrapper = await mountView([])

      await openAddDialog(wrapper)
      await wrapper
        .findComponent(ElUploadStub)
        .vm.$emit('update:fileList', [{ name: 'photo.jpg', url: 'https://cdn/x.jpg' }])
      await wrapper.find('.product-form').trigger('submit')
      await flushPromises()

      expect(elMessageWarningMock).toHaveBeenCalled()
      expect(createProductMock).not.toHaveBeenCalled()
    })

    it('shows an error and keeps the dialog open when the create request fails', async () => {
      uploadProductImageMock.mockResolvedValue({ path: 'x.jpg', url: 'https://cdn/x.jpg' })
      createProductMock.mockRejectedValue(new Error('boom'))
      const wrapper = await mountView([])

      await openAddDialog(wrapper)
      await wrapper
        .findComponent(ElUploadStub)
        .vm.$emit('update:fileList', [{ name: 'photo.jpg', raw: new File(['d'], 'p.jpg') }])
      await wrapper.find('#p-name').setValue('New Toy')
      await wrapper.find('#p-price').setValue(9.99)
      await wrapper.find('#p-stock').setValue(20)
      await wrapper.find('.product-form').trigger('submit')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
      expect(wrapper.find('.el-dialog-stub').exists()).toBe(true)
    })
  })

  describe('edit', () => {
    it('updates a product without re-uploading an already-hosted image', async () => {
      const existing = makeProduct({ id: 5, name: 'Old Bowl', stock: 3, images: ['https://cdn/old.jpg'] })
      updateProductMock.mockResolvedValue({ ...existing, stock: 40 })
      const wrapper = await mountView([existing])

      await wrapper.find('.icon-btn').trigger('click')
      await nextTick()
      await wrapper.find('#p-stock').setValue(40)
      await wrapper.find('.product-form').trigger('submit')
      await flushPromises()

      expect(uploadProductImageMock).not.toHaveBeenCalled()
      expect(updateProductMock).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ images: ['https://cdn/old.jpg'], stock: 40 }),
      )
    })
  })

  describe('delete', () => {
    it('removes the product after confirming', async () => {
      elMessageBoxConfirmMock.mockResolvedValue(undefined)
      deleteProductMock.mockResolvedValue(undefined)
      const p = makeProduct({ name: 'Chew Toy' })
      const wrapper = await mountView([p])

      await wrapper.find('.icon-btn.is-danger').trigger('click')
      await flushPromises()

      expect(deleteProductMock).toHaveBeenCalledWith(p.id)
      expect(wrapper.text()).not.toContain('Chew Toy')
    })

    it('leaves the product in place when the confirmation is cancelled', async () => {
      elMessageBoxConfirmMock.mockRejectedValue(new Error('cancel'))
      const p = makeProduct({ name: 'Chew Toy' })
      const wrapper = await mountView([p])

      await wrapper.find('.icon-btn.is-danger').trigger('click')
      await flushPromises()

      expect(deleteProductMock).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Chew Toy')
    })

    it('shows an error and keeps the product when deletion fails', async () => {
      elMessageBoxConfirmMock.mockResolvedValue(undefined)
      deleteProductMock.mockRejectedValue(new Error('boom'))
      const p = makeProduct({ name: 'Chew Toy' })
      const wrapper = await mountView([p])

      await wrapper.find('.icon-btn.is-danger').trigger('click')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Chew Toy')
    })
  })
})
