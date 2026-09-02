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
  fetchCategories,
  fetchProducts,
  isLowStock,
  updateProduct,
  type Category,
  type Product,
} from '@/lib/products'

const auth = useAuthStore()

const speciesOptions = ['Dog', 'Cat', 'Bird', 'Fish'] as const

const storeId = ref<number | null>(null)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const loadError = ref(false)

const brandOptions = computed(() =>
  Array.from(new Set(products.value.map((p) => p.brand).filter((b): b is string => !!b))).sort(),
)

async function loadProducts() {
  loading.value = true
  loadError.value = false
  try {
    await auth.init()
    if (!auth.customer) throw new Error('Not signed in')

    const store = await fetchStoreByOwnerId(auth.customer.id)
    if (!store) throw new Error('No store found for this account')
    storeId.value = store.id

    const [productRows, categoryRows] = await Promise.all([
      fetchProducts(store.id),
      fetchCategories(),
    ])
    products.value = productRows
    categories.value = categoryRows
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
    category_id: null as number | null,
    brand: '',
    species: speciesOptions[0] as string,
    price: null as number | null,
    stock: null as number | null,
    images: [] as UploadUserFile[],
  }
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
    category_id: product.category_id,
    brand: product.brand ?? '',
    species: product.species ?? speciesOptions[0],
    price: product.price,
    stock: product.stock,
    images: product.images.map((url, i) => ({ name: `image-${i}`, url }) as UploadUserFile),
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
      brand: form.brand.trim() || null,
      species: form.species,
      price: form.price,
      stock: form.stock,
      images,
      store_id: storeId.value,
    }

    if (dialogMode.value === 'add') {
      const created = await createProduct(payload)
      products.value.unshift(created)
      ElMessage.success(`Added "${created.name}"`)
    } else if (editingId.value !== null) {
      const updated = await updateProduct(editingId.value, payload)
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? 'Add Product' : 'Edit Product'"
      width="420px"
      align-center
    >
      <form class="product-form" @submit.prevent="saveProduct">
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
        <div class="form-row">
          <div class="form-field">
            <label for="p-category">Category</label>
            <el-select id="p-category" v-model="form.category_id" size="large" style="width: 100%">
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
          <el-select
            id="p-brand"
            v-model="form.brand"
            size="large"
            style="width: 100%"
            filterable
            allow-create
            default-first-option
            placeholder="Select or type a brand"
          >
            <el-option v-for="b in brandOptions" :key="b" :label="b" :value="b" />
          </el-select>
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

        <div class="form-actions">
          <button
            type="button"
            class="cancel-btn"
            @click="dialogVisible = false"
            :disabled="saving"
          >
            Cancel
          </button>
          <button type="submit" class="save-btn" :disabled="saving">
            {{ saving ? 'Saving…' : dialogMode === 'add' ? 'Add Product' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </el-dialog>
  </div>
</template>

<style scoped>
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
  object-fit: cover;
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

@media (prefers-color-scheme: dark) {
  .status-badge {
    background: rgba(47, 158, 68, 0.18);
    color: #82d996;
  }

  .status-badge.is-low {
    background: rgba(218, 109, 31, 0.18);
    color: #edb68f;
  }

  .status-badge.is-critical {
    background: rgba(192, 57, 43, 0.2);
    color: #f0908a;
  }
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

/* Dialog form */
.product-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
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

.form-field input {
  height: 2.6rem;
  padding: 0 0.85rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.88rem;
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.25rem;
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
</style>
