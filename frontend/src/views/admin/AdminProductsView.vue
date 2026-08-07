<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PhPlus, PhPencilSimple, PhTrash, PhMagnifyingGlass } from '@phosphor-icons/vue'

interface Product {
  id: number
  name: string
  category: string
  brand: string
  species: string
  price: number
  stock: number
}

const categories = ['Food & Nutrition', 'Bedding', 'Toys', 'Grooming Kit'] as const
const speciesOptions = ['Dog', 'Cat', 'Bird', 'Fish', 'Small Pet'] as const
const brands = [
  'PawMart Collection',
  'Nordic Home',
  'WildRoots',
  'Timber & Co',
  'Fresh Fields',
] as const

const products = reactive<Product[]>([
  { id: 1, name: 'Plush Nest Bed', category: 'Bedding', brand: 'Nordic Home', species: 'Dog', price: 345.0, stock: 18 },
  { id: 2, name: 'Elevated Feeding Stand', category: 'Food & Nutrition', brand: 'Timber & Co', species: 'Dog', price: 180.0, stock: 24 },
  { id: 3, name: 'Woven Leather Leash Set', category: 'Toys', brand: 'WildRoots', species: 'Dog', price: 210.0, stock: 12 },
  { id: 4, name: 'Sisal Scratch Post', category: 'Toys', brand: 'Timber & Co', species: 'Cat', price: 540.0, stock: 9 },
  { id: 5, name: 'Grooming Brush Kit', category: 'Grooming Kit', brand: 'PawMart Collection', species: 'Dog', price: 125.0, stock: 4 },
  { id: 6, name: 'Gourmet Chicken & Wild Salmon', category: 'Food & Nutrition', brand: 'Fresh Fields', species: 'Cat', price: 45.0, stock: 30 },
  { id: 7, name: 'Cloud Cushion Bed', category: 'Bedding', brand: 'Nordic Home', species: 'Cat', price: 96.0, stock: 15 },
  { id: 8, name: 'Feather Wand Toy', category: 'Toys', brand: 'WildRoots', species: 'Cat', price: 22.0, stock: 2 },
])

const searchQuery = ref('')

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return products
  return products.filter(
    (p) => p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query),
  )
})

function stockStatus(stock: number) {
  if (stock === 0) return { label: 'Out of Stock', tone: 'is-critical' }
  if (stock <= 5) return { label: 'Low Stock', tone: 'is-low' }
  return { label: 'In Stock', tone: 'is-ok' }
}

function emptyForm() {
  return {
    name: '',
    category: categories[0],
    brand: brands[0],
    species: speciesOptions[0],
    price: null as number | null,
    stock: null as number | null,
  }
}

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const form = reactive(emptyForm())

function openAddDialog() {
  dialogMode.value = 'add'
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

function openEditDialog(product: Product) {
  dialogMode.value = 'edit'
  editingId.value = product.id
  Object.assign(form, {
    name: product.name,
    category: product.category,
    brand: product.brand,
    species: product.species,
    price: product.price,
    stock: product.stock,
  })
  dialogVisible.value = true
}

function saveProduct() {
  if (!form.name.trim() || form.price === null || form.stock === null) {
    ElMessage.warning('Please fill in name, price, and stock.')
    return
  }

  if (dialogMode.value === 'add') {
    products.push({
      id: Math.max(0, ...products.map((p) => p.id)) + 1,
      name: form.name.trim(),
      category: form.category,
      brand: form.brand,
      species: form.species,
      price: form.price,
      stock: form.stock,
    })
    ElMessage.success(`Added "${form.name.trim()}"`)
  } else {
    const product = products.find((p) => p.id === editingId.value)
    if (product) {
      Object.assign(product, {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand,
        species: form.species,
        price: form.price,
        stock: form.stock,
      })
      ElMessage.success(`Updated "${product.name}"`)
    }
  }

  dialogVisible.value = false
}

async function deleteProduct(product: Product) {
  try {
    await ElMessageBox.confirm(`Remove "${product.name}" from the catalog?`, 'Delete Product', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
  } catch {
    return
  }

  const index = products.findIndex((p) => p.id === product.id)
  if (index !== -1) products.splice(index, 1)
  ElMessage.success(`Removed "${product.name}"`)
}
</script>

<template>
  <div class="admin-products">
    <div class="page-header">
      <div>
        <p class="eyebrow">Admin</p>
        <h1 class="page-title">Products</h1>
      </div>
      <button type="button" class="add-btn" @click="openAddDialog">
        <PhPlus :size="16" />
        Add Product
      </button>
    </div>

    <div class="toolbar">
      <el-input v-model="searchQuery" placeholder="Search products or brands" size="large" class="search-input">
        <template #prefix>
          <PhMagnifyingGlass :size="16" />
        </template>
      </el-input>
      <span class="result-count">{{ filteredProducts.length }} Products</span>
    </div>

    <div class="table-card">
      <el-table :data="filteredProducts" style="width: 100%" empty-text="No products match your search.">
        <el-table-column prop="name" label="Product" min-width="160">
          <template #default="{ row }">
            <span class="cell-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="Category">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="brand" label="Brand">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.brand }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="species" label="Species">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.species }}</span>
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? 'Add Product' : 'Edit Product'"
      width="420px"
      align-center
    >
      <form class="product-form" @submit.prevent="saveProduct">
        <div class="form-field">
          <label for="p-name">Product Name</label>
          <input id="p-name" v-model="form.name" type="text" placeholder="e.g. Plush Nest Bed" required />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="p-category">Category</label>
            <el-select id="p-category" v-model="form.category" size="large" style="width: 100%">
              <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
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
          <el-select id="p-brand" v-model="form.brand" size="large" style="width: 100%">
            <el-option v-for="b in brands" :key="b" :label="b" :value="b" />
          </el-select>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="p-price">Price ($)</label>
            <input id="p-price" v-model.number="form.price" type="number" min="0" step="0.01" required />
          </div>
          <div class="form-field">
            <label for="p-stock">Stock</label>
            <input id="p-stock" v-model.number="form.stock" type="number" min="0" required />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="dialogVisible = false">Cancel</button>
          <button type="submit" class="save-btn">
            {{ dialogMode === 'add' ? 'Add Product' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-products {
  padding-bottom: 2rem;
}

.page-header {
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

.toolbar {
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

.table-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  overflow-x: auto;
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
