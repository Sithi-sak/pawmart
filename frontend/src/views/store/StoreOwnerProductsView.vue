<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadUserFile } from 'element-plus'
import { PhPlus, PhPencilSimple, PhTrash, PhMagnifyingGlass, PhImage } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { uploadProductImage } from '@/lib/storage'
import { fetchStoreByOwnerId } from '@/lib/stores'
import {
  createProduct,
  deleteProduct as deleteProductRequest,
  fetchBrands,
  fetchCategories,
  fetchProducts,
  isLowStock,
  saveProductOptions,
  updateProduct,
  type Category,
  type Product,
} from '@/lib/products'

const auth = useAuthStore()

const speciesOptions = ['Dog', 'Cat', 'Bird', 'Fish'] as const

// Starting points for the option editor, not a fixed list -- both the name
// and the values are free text (el-select allow-create), so an owner can
// type "Length" or "1.5 kg" when none of these fit.
const OPTION_PRESETS: Record<string, string[]> = {
  Size: ['XS', 'S', 'M', 'L', 'XL'],
  Color: ['Black', 'Grey', 'White', 'Brown', 'Red', 'Blue', 'Pink'],
  Weight: ['500 g', '1 kg', '2 kg', '5 kg', '10 kg'],
  'Pack Size': ['1 pack', '3 pack', '6 pack', '12 pack'],
  Flavor: ['Chicken', 'Beef', 'Salmon', 'Tuna', 'Lamb'],
  Material: ['Cotton', 'Nylon', 'Leather', 'Rubber'],
}
const OPTION_NAME_SUGGESTIONS = Object.keys(OPTION_PRESETS)
const MAX_OPTION_GROUPS = 5

function optionValueSuggestions(name: string): string[] {
  const match = OPTION_NAME_SUGGESTIONS.find((n) => n.toLowerCase() === name.trim().toLowerCase())
  return match ? (OPTION_PRESETS[match] ?? []) : []
}

const storeId = ref<number | null>(null)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const loadError = ref(false)

const catalogBrands = ref<string[]>([])

// Own products first (an owner mostly re-lists their own brands), then the
// rest of the catalog as a long tail.
const brandOptions = computed(() => {
  const own = products.value.map((p) => p.brand?.trim()).filter((b): b is string => !!b)
  return Array.from(
    new Map([...own, ...catalogBrands.value].map((b) => [b.toLowerCase(), b])).values(),
  )
})

function brandSuggestions(query: string, cb: (items: { value: string }[]) => void) {
  const q = query.trim().toLowerCase()
  const matches = q
    ? brandOptions.value.filter((b) => b.toLowerCase().includes(q))
    : brandOptions.value
  cb(matches.map((value) => ({ value })))
}

async function loadProducts() {
  loading.value = true
  loadError.value = false
  try {
    await auth.init()
    if (!auth.customer) throw new Error('Not signed in')

    const store = await fetchStoreByOwnerId(auth.customer.id)
    if (!store) throw new Error('No store found for this account')
    storeId.value = store.id

    const [productRows, categoryRows, brandRows] = await Promise.all([
      fetchProducts(store.id),
      fetchCategories(),
      fetchBrands(),
    ])
    products.value = productRows
    categories.value = categoryRows
    catalogBrands.value = brandRows
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)

const searchQuery = ref('')

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return products.value
  return products.value.filter(
    (p) => p.name.toLowerCase().includes(query) || (p.brand ?? '').toLowerCase().includes(query),
  )
})

const pageSize = ref(10)
const currentPage = ref(1)

// Land back on a valid page whenever filtering shrinks the result set.
watch(searchQuery, () => {
  currentPage.value = 1
})

const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProducts.value.slice(start, start + pageSize.value)
})

function stockStatus(stock: number) {
  if (stock === 0) return { label: 'Out of Stock', tone: 'is-critical' }
  if (isLowStock({ stock })) return { label: 'Low Stock', tone: 'is-low' }
  return { label: 'In Stock', tone: 'is-ok' }
}

function emptyForm() {
  return {
    name: '',
    description: '',
    category_id: null as number | null,
    brand: '',
    species: speciesOptions[0] as string,
    price: null as number | null,
    stock: null as number | null,
    images: [] as UploadUserFile[],
    is_promotional: false,
    promotion_note: '',
    is_discounted: false,
    discount_percent: null as number | null,
    optionGroups: [] as { name: string; values: string[] }[],
  }
}

function addOptionGroup() {
  form.optionGroups.push({ name: '', values: [] })
}

function removeOptionGroup(index: number) {
  form.optionGroups.splice(index, 1)
}

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const form = reactive(emptyForm())
const saving = ref(false)

function openAddDialog() {
  dialogMode.value = 'add'
  editingId.value = null
  Object.assign(form, emptyForm(), { category_id: categories.value[0]?.id ?? null })
  dialogVisible.value = true
}

function openEditDialog(product: Product) {
  dialogMode.value = 'edit'
  editingId.value = product.id
  Object.assign(form, {
    name: product.name,
    description: product.description ?? '',
    category_id: product.category_id,
    brand: product.brand ?? '',
    species: product.species ?? speciesOptions[0],
    price: product.price,
    stock: product.stock,
    images: product.images.map((url, i) => ({ name: `image-${i}`, url }) as UploadUserFile),
    is_promotional: product.is_promotional,
    promotion_note: product.promotion_note ?? '',
    is_discounted: product.is_discounted,
    discount_percent: product.discount_percent,
    optionGroups: [...(product.product_option_groups ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((group) => ({
        name: group.name,
        values: [...group.product_option_values]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => v.value),
      })),
  })
  dialogVisible.value = true
}

async function saveProduct() {
  if (!form.name.trim() || form.price === null || form.stock === null) {
    ElMessage.warning('Please fill in name, price, and stock.')
    return
  }

  if (!form.images.length) {
    ElMessage.warning('Please upload at least one product image.')
    return
  }

  if (form.is_discounted && (!form.discount_percent || form.discount_percent <= 0)) {
    ElMessage.warning('Please enter a discount percentage.')
    return
  }

  if (form.optionGroups.some((g) => !g.name.trim() !== !g.values.length)) {
    ElMessage.warning('Each option needs a name and at least one value.')
    return
  }

  const accessToken = auth.session?.access_token
  if (!accessToken || storeId.value === null) {
    ElMessage.error('Your session has expired. Please sign in again.')
    return
  }

  saving.value = true
  try {
    const images: string[] = []
    for (const file of form.images) {
      if (file.raw) {
        const uploaded = await uploadProductImage(file.raw, accessToken)
        images.push(uploaded.url)
      } else if (file.url) {
        images.push(file.url)
      }
    }

    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      brand: (form.brand ?? '').trim() || null,
      species: form.species,
      price: form.price,
      stock: form.stock,
      images,
      is_promotional: form.is_promotional,
      promotion_note: form.is_promotional ? form.promotion_note.trim() || null : null,
      is_discounted: form.is_discounted,
      discount_percent: form.is_discounted ? form.discount_percent : null,
      store_id: storeId.value,
    }

    // Options live in their own tables, so they're a second write once the
    // product row exists (and after an edit, they replace whatever the
    // update's response still carried).
    const optionGroups = form.optionGroups.map((g) => ({ name: g.name, values: [...g.values] }))

    if (dialogMode.value === 'add') {
      const created = await createProduct(payload)
      created.product_option_groups = await saveProductOptions(created.id, optionGroups)
      products.value.unshift(created)
      ElMessage.success(`Added "${created.name}"`)
    } else if (editingId.value !== null) {
      const updated = await updateProduct(editingId.value, payload)
      updated.product_option_groups = await saveProductOptions(updated.id, optionGroups)
      const index = products.value.findIndex((p) => p.id === editingId.value)
      if (index !== -1) products.value[index] = updated
      ElMessage.success(`Updated "${updated.name}"`)
    }

    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to save product.')
  } finally {
    saving.value = false
  }
}

async function deleteProduct(product: Product) {
  try {
    await ElMessageBox.confirm(`Remove "${product.name}" from your catalog?`, 'Delete Product', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteProductRequest(product.id)
    const index = products.value.findIndex((p) => p.id === product.id)
    if (index !== -1) products.value.splice(index, 1)
    ElMessage.success(`Removed "${product.name}"`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to delete product.')
  }
}
</script>

<template>
  <div class="admin-products">
    <div class="page-header">
      <div>
        <p class="eyebrow">Store</p>
        <h1 class="page-title">Products</h1>
      </div>
      <button type="button" class="add-btn" @click="openAddDialog">
        <PhPlus :size="16" />
        Add Product
      </button>
    </div>

    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="Search products or brands"
        size="large"
        class="search-input"
      >
        <template #prefix>
          <PhMagnifyingGlass :size="16" />
        </template>
      </el-input>
      <span class="result-count">{{ filteredProducts.length }} Products</span>
    </div>

    <div v-if="loading" class="table-card skeleton-card">
      <el-skeleton v-for="n in 6" :key="n" animated class="skeleton-row">
        <template #template>
          <el-skeleton-item variant="image" class="sk-cell sk-cell--thumb" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--name" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--category" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--price" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--stock" />
          <el-skeleton-item variant="button" class="sk-cell sk-cell--status" />
        </template>
      </el-skeleton>
    </div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load products right now. Please try again shortly.
    </div>
    <div v-else class="products-body">
      <div class="table-card">
        <el-table
          :data="pagedProducts"
          height="100%"
          style="width: 100%"
          :empty-text="
            products.length === 0 ? 'No products yet.' : 'No products match your search.'
          "
        >
          <el-table-column label="" width="70">
            <template #default="{ row }">
              <img v-if="row.images[0]" :src="row.images[0]" class="cell-thumb" alt="" />
              <div v-else class="cell-thumb cell-thumb--empty">
                <PhImage :size="18" />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="Product" min-width="160">
            <template #default="{ row }">
              <span class="cell-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Category">
            <template #default="{ row }">
              <span class="cell-muted">{{ row.categories?.name ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="brand" label="Brand">
            <template #default="{ row }">
              <span class="cell-muted">{{ row.brand ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="species" label="Species">
            <template #default="{ row }">
              <span class="cell-muted">{{ row.species ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Price">
            <template #default="{ row }">${{ row.price.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="stock" label="Stock" />
          <el-table-column label="Status">
            <template #default="{ row }">
              <span class="status-badge" :class="stockStatus(row.stock).tone">
                {{ stockStatus(row.stock).label }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Tags">
            <template #default="{ row }">
              <div class="cell-tags">
                <span v-if="row.is_promotional" class="tag-badge tag-promo">Promo</span>
                <span
                  v-if="row.is_discounted && row.discount_percent"
                  class="tag-badge tag-discount"
                >
                  -{{ Math.round(row.discount_percent) }}%
                </span>
                <span v-if="!row.is_promotional && !row.is_discounted" class="cell-muted">—</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="" width="100" align="right">
            <template #default="{ row }">
              <div class="cell-actions">
                <button type="button" class="icon-btn" @click="openEditDialog(row)">
                  <PhPencilSimple :size="16" />
                </button>
                <button type="button" class="icon-btn is-danger" @click="deleteProduct(row)">
                  <PhTrash :size="16" />
                </button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="filteredProducts.length > 0" class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredProducts.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </div>

    <el-drawer
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? 'Add Product' : 'Edit Product'"
      direction="rtl"
      size="720px"
      class="product-drawer"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <form id="product-form" class="product-form" @submit.prevent="saveProduct">
        <div class="form-media">
          <div class="form-field">
            <label>Product Images</label>
            <el-upload
              v-model:file-list="form.images"
              list-type="picture-card"
              accept="image/*"
              :auto-upload="false"
            >
              <PhPlus :size="20" />
            </el-upload>
            <p class="field-hint">At least one image is required.</p>
          </div>
        </div>

        <div class="form-details">
          <div class="form-field">
            <label for="p-name">Product Name</label>
            <input
              id="p-name"
              v-model="form.name"
              type="text"
              placeholder="e.g. Plush Nest Bed"
              required
            />
          </div>
          <div class="form-field">
            <label for="p-description">Description</label>
            <textarea
              id="p-description"
              v-model="form.description"
              rows="4"
              placeholder="What makes this product worth buying?"
            />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label for="p-category">Category</label>
              <el-select
                id="p-category"
                v-model="form.category_id"
                size="large"
                style="width: 100%"
              >
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </div>
            <div class="form-field">
              <label for="p-species">Species</label>
              <el-select id="p-species" v-model="form.species" size="large" style="width: 100%">
                <el-option v-for="s in speciesOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </div>
          </div>
          <div class="form-field">
            <label for="p-brand">Brand</label>
            <!-- Autocomplete rather than a filterable el-select: a select's
                 typed text is only a filter until you commit it to a created
                 option, so anything typed and left uncommitted was silently
                 dropped on save. Here the input IS the model. -->
            <el-autocomplete
              id="p-brand"
              v-model="form.brand"
              :fetch-suggestions="brandSuggestions"
              :trigger-on-focus="true"
              size="large"
              style="width: 100%"
              clearable
              placeholder="Select or type a brand"
            />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label for="p-price">Price ($)</label>
              <input
                id="p-price"
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div class="form-field">
              <label for="p-stock">Stock</label>
              <input id="p-stock" v-model.number="form.stock" type="number" min="0" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field form-field--switch">
              <label for="p-promotional">Promotional</label>
              <el-switch id="p-promotional" v-model="form.is_promotional" />
            </div>
            <div class="form-field form-field--switch">
              <label for="p-discounted">Discount</label>
              <el-switch id="p-discounted" v-model="form.is_discounted" />
            </div>
          </div>
          <div v-if="form.is_promotional || form.is_discounted" class="form-row">
            <div v-if="form.is_promotional" class="form-field">
              <label for="p-promotion-note">Promotion Details</label>
              <input
                id="p-promotion-note"
                v-model="form.promotion_note"
                type="text"
                placeholder="e.g. Buy One Get One Free"
              />
            </div>
            <div v-if="form.is_discounted" class="form-field">
              <label for="p-discount-percent">Discount Percentage</label>
              <input
                id="p-discount-percent"
                v-model.number="form.discount_percent"
                type="number"
                min="1"
                max="90"
                step="1"
                placeholder="e.g. 30"
                required
              />
            </div>
          </div>

          <div class="form-field option-editor">
            <label>Options</label>
            <p class="field-hint">
              Choices shoppers pick on the product page — size, color, weight, pack size. Leave
              empty if this product only comes one way.
            </p>

            <div v-for="(group, index) in form.optionGroups" :key="index" class="option-row">
              <el-select
                v-model="group.name"
                size="large"
                class="option-name"
                filterable
                allow-create
                default-first-option
                placeholder="Option name (e.g. Size)"
              >
                <el-option v-for="n in OPTION_NAME_SUGGESTIONS" :key="n" :label="n" :value="n" />
              </el-select>
              <el-select
                v-model="group.values"
                size="large"
                class="option-values"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="Values — type and press Enter (e.g. 1 kg)"
              >
                <el-option
                  v-for="v in optionValueSuggestions(group.name)"
                  :key="v"
                  :label="v"
                  :value="v"
                />
              </el-select>
              <button
                type="button"
                class="icon-btn is-danger option-remove"
                aria-label="Remove option"
                @click="removeOptionGroup(index)"
              >
                <PhTrash :size="16" />
              </button>
            </div>

            <button
              v-if="form.optionGroups.length < MAX_OPTION_GROUPS"
              type="button"
              class="add-option-btn"
              @click="addOptionGroup"
            >
              <PhPlus :size="14" />
              Add Option
            </button>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="form-actions">
          <button
            type="button"
            class="cancel-btn"
            @click="dialogVisible = false"
            :disabled="saving"
          >
            Cancel
          </button>
          <button type="submit" form="product-form" class="save-btn" :disabled="saving">
            {{ saving ? 'Saving…' : dialogMode === 'add' ? 'Add Product' : 'Save Changes' }}
          </button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
:deep(.product-drawer) {
  max-width: 100vw;
}

:deep(.product-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: var(--font-serif);
  font-size: 1.25rem;
}

:deep(.product-drawer .el-drawer__body) {
  padding-top: 1.25rem;
}

:deep(.product-drawer .el-drawer__footer) {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* Lay the thumbnails and the add-tile out as one grid -- Element's default
   float + fixed 148px tiles don't fit two to a row in the image rail. */
:deep(.product-drawer .el-upload-list--picture-card) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin: 0;
}

:deep(.product-drawer .el-upload-list--picture-card .el-upload-list__item),
:deep(.product-drawer .el-upload--picture-card) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  margin: 0;
  border-radius: 0;
}

/* The list is a TransitionGroup, so every thumbnail replays its enter
   animation each time the drawer opens. */
:deep(.product-drawer .el-list-enter-active),
:deep(.product-drawer .el-list-leave-active) {
  transition: none;
}

:deep(.product-drawer .el-list-enter-from),
:deep(.product-drawer .el-list-leave-to) {
  opacity: 1;
  transform: none;
}

/* Square off the pill switch so its knob isn't clipped by the rounded track. */
:deep(.product-drawer .el-switch__core),
:deep(.product-drawer .el-switch__core .el-switch__action) {
  border-radius: 0;
}

.admin-products {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 0.4rem;
}

.page-title {
  font-size: 2rem;
}

.add-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.75rem;
  padding: 0 1.25rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.add-btn:hover {
  background: var(--color-accent-dark);
}

.state-message {
  flex: 1;
  min-height: 0;
  padding: 2.5rem 0;
  text-align: center;
  color: var(--color-text);
  opacity: 0.65;
  overflow-y: auto;
}

.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.search-input {
  max-width: 360px;
}

.result-count {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  white-space: nowrap;
}

.products-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-card {
  flex: 1;
  min-height: 0;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  overflow-x: auto;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.skeleton-row:last-child {
  border-bottom: none;
}

.sk-cell {
  flex-shrink: 0;
}

.sk-cell--thumb {
  width: 42px;
  height: 42px;
}

.sk-cell--name {
  width: 160px;
}

.sk-cell--category {
  width: 100px;
}

.sk-cell--price {
  width: 60px;
}

.sk-cell--stock {
  width: 50px;
}

.sk-cell--status {
  width: 90px;
  margin-left: auto;
}

.pagination-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.cell-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
  background-color: #fff;
}

.cell-thumb--empty {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  opacity: 0.5;
}

.cell-name {
  color: var(--color-heading);
  font-weight: 600;
}

.cell-muted {
  opacity: 0.65;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  height: 1.6rem;
  padding: 0 0.65rem;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  font-weight: 600;
  text-transform: uppercase;
  background: #ebf7ee;
  color: #2f9e44;
}

.status-badge.is-low {
  background: #fbf0e9;
  color: var(--color-accent-dark);
}

.status-badge.is-critical {
  background: #fceceb;
  color: #c0392b;
}

.cell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  height: 1.6rem;
  padding: 0 0.6rem;
  font-size: 0.65rem;
  letter-spacing: 0.03em;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.tag-promo {
  background: #eaf1fb;
  color: #2b6cb0;
}

.tag-discount {
  background: #fceceb;
  color: #c0392b;
}

.cell-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.icon-btn.is-danger:hover {
  border-color: #c0392b;
  color: #c0392b;
}

/* Drawer form */
.product-form {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
  align-items: start;
}

.form-media {
  position: sticky;
  top: 0;
}

.form-details {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-width: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.form-field--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.form-field label {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
}

.form-field input,
.form-field textarea {
  padding: 0 0.85rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.88rem;
}

.form-field input {
  height: 2.6rem;
}

.form-field textarea {
  min-height: 6rem;
  padding: 0.6rem 0.85rem;
  line-height: 1.5;
  resize: vertical;
}

.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
}

.cancel-btn {
  height: 2.6rem;
  padding: 0 1.1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-accent);
}

.cancel-btn:disabled,
.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn {
  height: 2.6rem;
  padding: 0 1.1rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--color-accent-dark);
}

@media (max-width: 720px) {
  .product-form {
    grid-template-columns: 1fr;
    gap: 1.1rem;
  }

  .form-media {
    position: static;
  }
}

@media (max-width: 560px) {
  .page-header {
    flex-direction: column;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

.option-editor .field-hint {
  margin-bottom: 0.75rem;
}

.option-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) auto;
  align-items: start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.option-remove {
  margin-top: 0.35rem;
}

.add-option-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border: 1px dashed var(--color-border);
  background: none;
  color: var(--color-heading);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.add-option-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (max-width: 640px) {
  .option-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .option-row .option-values {
    grid-column: 1 / -1;
  }
}
</style>
