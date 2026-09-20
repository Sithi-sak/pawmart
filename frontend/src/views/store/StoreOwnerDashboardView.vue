<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  PhCurrencyDollar,
  PhShoppingBagOpen,
  PhChartLineUp,
  PhTrendUp,
  PhTrendDown,
  PhMinus,
  PhWarning,
} from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchDashboardStats,
  formatDelta,
  type DashboardStats,
  type DeltaTrend,
} from '@/lib/adminDashboard'
import { LOW_STOCK_THRESHOLD, fetchProducts, isLowStock, type Product } from '@/lib/products'
import { fetchStoreByOwnerId, updateStore, type Store } from '@/lib/stores'

interface Stat {
  label: string
  value: string
  delta: string
  trend: DeltaTrend
  icon: typeof PhCurrencyDollar
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const trendIcons: Record<DeltaTrend, typeof PhTrendUp> = {
  up: PhTrendUp,
  down: PhTrendDown,
  flat: PhMinus,
}

const auth = useAuthStore()
const store = ref<Store | null>(null)
const dashboardStats = ref<DashboardStats | null>(null)
const products = ref<Product[]>([])
const loading = ref(true)
const loadError = ref(false)

const profileForm = reactive({ description: '', logo_url: '' })
const savingProfile = ref(false)

const stats = computed<Stat[]>(() => {
  const s = dashboardStats.value
  if (!s) return []

  const revenueDelta = formatDelta(s.revenueThisMonth, s.revenueLastMonth)
  const ordersDelta = formatDelta(s.ordersThisMonth, s.ordersLastMonth)
  const avgOrderDelta = formatDelta(s.avgOrderValueThisMonth, s.avgOrderValueLastMonth)

  return [
    {
      label: 'Revenue This Month',
      value: currencyFormatter.format(s.revenueThisMonth),
      delta: revenueDelta.text,
      trend: revenueDelta.trend,
      icon: PhCurrencyDollar,
    },
    {
      label: 'Orders This Month',
      value: String(s.ordersThisMonth),
      delta: ordersDelta.text,
      trend: ordersDelta.trend,
      icon: PhShoppingBagOpen,
    },
    {
      label: 'Avg. Order Value',
      value: currencyFormatter.format(s.avgOrderValueThisMonth),
      delta: avgOrderDelta.text,
      trend: avgOrderDelta.trend,
      icon: PhChartLineUp,
    },
  ]
})

const lowStockProducts = computed(() =>
  products.value.filter(isLowStock).sort((a, b) => a.stock - b.stock),
)

function stockStatus(product: Product) {
  if (product.stock === 0) return 'Out of Stock'
  if (product.stock <= LOW_STOCK_THRESHOLD / 3) return 'Critical'
  return 'Low'
}

async function saveProfile() {
  if (!store.value) return
  savingProfile.value = true
  try {
    const updated = await updateStore(store.value.id, {
      description: profileForm.description.trim() || null,
      logo_url: profileForm.logo_url.trim() || null,
    })
    store.value = updated
    ElMessage.success('Store profile updated')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update store profile.')
  } finally {
    savingProfile.value = false
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = false
  try {
    await auth.init()
    if (!auth.customer) throw new Error('Not signed in')

    const storeRow = await fetchStoreByOwnerId(auth.customer.id)
    if (!storeRow) throw new Error('No store found for this account')
    store.value = storeRow
    profileForm.description = storeRow.description ?? ''
    profileForm.logo_url = storeRow.logo_url ?? ''

    const [statsResult, productRows] = await Promise.all([
      fetchDashboardStats(storeRow.id),
      fetchProducts(storeRow.id),
    ])
    dashboardStats.value = statsResult
    products.value = productRows
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <p class="eyebrow">Store</p>
      <h1 class="page-title">{{ store?.name ?? 'Dashboard' }}</h1>
    </div>

    <template v-if="loading">
      <div class="stats-grid">
        <div v-for="n in 3" :key="n" class="stat-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" class="sk-stat-label" />
              <el-skeleton-item variant="h1" class="sk-stat-value" />
              <el-skeleton-item variant="text" class="sk-stat-delta" />
            </template>
          </el-skeleton>
        </div>
      </div>

      <div class="widget-card skeleton-card">
        <div class="widget-header">
          <div class="widget-heading">
            <PhWarning :size="18" weight="bold" />
            <h2>Low Stock Alerts</h2>
          </div>
        </div>
        <el-skeleton v-for="n in 4" :key="n" animated class="skeleton-row">
          <template #template>
            <el-skeleton-item variant="text" class="sk-cell sk-cell--product" />
            <el-skeleton-item variant="text" class="sk-cell sk-cell--category" />
            <el-skeleton-item variant="text" class="sk-cell sk-cell--stock" />
            <el-skeleton-item variant="button" class="sk-cell sk-cell--status" />
          </template>
        </el-skeleton>
      </div>

      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-heading">
            <h2>Store Profile</h2>
          </div>
        </div>
        <el-skeleton animated>
          <template #template>
            <div class="profile-grid">
              <div class="form-field">
                <el-skeleton-item variant="text" class="sk-form-label" />
                <el-skeleton-item variant="p" style="height: 6rem" />
              </div>
              <div class="form-field">
                <el-skeleton-item variant="text" class="sk-form-label" />
                <el-skeleton-item variant="text" style="height: 2.6rem" />
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>
    </template>
    <div v-else-if="loadError" class="state-message">
      Couldn't load dashboard data right now. Please try again shortly.
    </div>
    <template v-else>
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <p class="stat-label">{{ stat.label }}</p>
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-delta" :class="`is-${stat.trend}`">
            <component :is="trendIcons[stat.trend]" :size="14" weight="bold" />
            {{ stat.delta }}
          </p>
        </div>
      </div>

      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-heading">
            <PhWarning :size="18" weight="bold" />
            <h2>Low Stock Alerts</h2>
          </div>
          <span class="widget-count">{{ lowStockProducts.length }} items</span>
        </div>

        <el-table
          :data="lowStockProducts"
          style="width: 100%"
          empty-text="No low-stock products right now."
        >
          <el-table-column prop="name" label="Product">
            <template #default="{ row }">
              <span class="cell-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Category">
            <template #default="{ row }">
              <span class="cell-muted">{{ row.categories?.name ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Stock">
            <template #default="{ row }">{{ row.stock }} / {{ LOW_STOCK_THRESHOLD }}</template>
          </el-table-column>
          <el-table-column label="Status">
            <template #default="{ row }">
              <span class="status-badge" :class="{ 'is-critical': stockStatus(row) !== 'Low' }">
                {{ stockStatus(row) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-heading">
            <h2>Store Profile</h2>
          </div>
          <span class="widget-count">/store/{{ store?.slug }}</span>
        </div>

        <form class="profile-form" @submit.prevent="saveProfile">
          <div class="profile-grid">
            <div class="form-field">
              <label for="s-description">Description</label>
              <textarea
                id="s-description"
                v-model="profileForm.description"
                rows="4"
                placeholder="Tell shoppers about your store"
              />
            </div>
            <div class="form-field">
              <label for="s-logo">Logo URL</label>
              <input
                id="s-logo"
                v-model="profileForm.logo_url"
                type="url"
                placeholder="https://…"
              />
              <p class="field-hint">
                Square images look best. Leave blank to use the default mark.
              </p>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="save-btn" :disabled="savingProfile">
              {{ savingProfile ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  padding-bottom: 2rem;
}

.page-header {
  margin-bottom: 2rem;
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

.state-message {
  padding: 2.5rem 0;
  text-align: center;
  color: var(--color-text);
  opacity: 0.65;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.4rem;
}

.stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 0.4rem;
}

.stat-value {
  font-family: var(--font-serif);
  font-size: 1.65rem;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.stat-delta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 500;
}

.stat-delta.is-up {
  color: #2f9e44;
}

.stat-delta.is-down {
  color: #c0392b;
}

.stat-delta.is-flat {
  color: var(--color-text);
  opacity: 0.6;
}

.sk-stat-label {
  width: 60%;
  margin-bottom: 0.5rem;
}

.sk-stat-value {
  width: 75%;
  margin-bottom: 0.6rem;
}

.sk-stat-delta {
  width: 55%;
}

.skeleton-card {
  padding: 0;
}

.skeleton-card .widget-header {
  padding: 1.5rem 1.5rem 1rem;
  margin-bottom: 0;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.skeleton-row:last-child {
  border-bottom: none;
}

.sk-cell {
  flex-shrink: 0;
}

.sk-cell--product {
  width: 160px;
}

.sk-cell--category {
  width: 100px;
}

.sk-cell--stock {
  width: 70px;
}

.sk-cell--status {
  width: 80px;
  margin-left: auto;
}

.sk-form-label {
  width: 100px;
  margin-bottom: 0.5rem;
}

/* Widget */
.widget-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.widget-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-accent);
}

.widget-heading h2 {
  font-size: 1.1rem;
  color: var(--color-heading);
}

.widget-count {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
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
  background: #fbf0e9;
  color: var(--color-accent-dark);
}

.status-badge.is-critical {
  background: #fceceb;
  color: #c0392b;
}

/* Profile form */
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  padding: 0.6rem 0.85rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.88rem;
  resize: vertical;
}

.form-field input {
  height: 2.6rem;
}

.form-field textarea {
  min-height: 6rem;
}

.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
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

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
