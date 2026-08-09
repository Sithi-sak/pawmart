<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PhCurrencyDollar,
  PhShoppingBagOpen,
  PhUsers,
  PhChartLineUp,
  PhTrendUp,
  PhTrendDown,
  PhWarning,
} from '@phosphor-icons/vue'
import { fetchDashboardStats, type DashboardStats } from '@/lib/adminDashboard'
import { LOW_STOCK_THRESHOLD, fetchProducts, isLowStock, type Product } from '@/lib/products'

interface Stat {
  label: string
  value: string
  delta: string
  trend: 'up' | 'down'
  icon: typeof PhCurrencyDollar
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatDelta(current: number, previous: number): { text: string; trend: 'up' | 'down' } {
  if (previous === 0) {
    return current > 0 ? { text: 'New this month', trend: 'up' } : { text: 'No change', trend: 'up' }
  }
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return { text: `${sign}${pct.toFixed(1)}% vs last month`, trend: pct >= 0 ? 'up' : 'down' }
}

const dashboardStats = ref<DashboardStats | null>(null)
const products = ref<Product[]>([])
const loading = ref(true)
const loadError = ref(false)

const stats = computed<Stat[]>(() => {
  const s = dashboardStats.value
  if (!s) return []

  const revenueDelta = formatDelta(s.revenueThisMonth, s.revenueLastMonth)
  const ordersDelta = formatDelta(s.ordersThisMonth, s.ordersLastMonth)
  const avgOrderDelta = formatDelta(s.avgOrderValueThisMonth, s.avgOrderValueLastMonth)

  return [
    {
      label: 'Total Revenue',
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
      label: 'New Customers',
      value: String(s.newCustomersThisMonth),
      delta: `+${s.newCustomersThisWeek} this week`,
      trend: 'up',
      icon: PhUsers,
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

onMounted(async () => {
  loading.value = true
  loadError.value = false
  try {
    const [statsResult, productRows] = await Promise.all([fetchDashboardStats(), fetchProducts()])
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
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Dashboard</h1>
    </div>

    <div v-if="loading" class="state-message">Loading dashboard…</div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load dashboard data right now. Please try again shortly.
    </div>
    <template v-else>
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <!-- <div class="stat-icon">
            <component :is="stat.icon" :size="20" weight="bold" />
          </div> -->
          <p class="stat-label">{{ stat.label }}</p>
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-delta" :class="stat.trend === 'up' ? 'is-up' : 'is-down'">
            <component :is="stat.trend === 'up' ? PhTrendUp : PhTrendDown" :size="14" weight="bold" />
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

        <el-table :data="lowStockProducts" style="width: 100%" empty-text="No low-stock products right now.">
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
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.4rem;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 0.9rem;
  background: var(--color-background-soft);
  color: var(--color-accent);
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

/* Widget */
.widget-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
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

@media (prefers-color-scheme: dark) {
  .status-badge {
    background: rgba(218, 109, 31, 0.18);
    color: #edb68f;
  }

  .status-badge.is-critical {
    background: rgba(192, 57, 43, 0.2);
    color: #f0908a;
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
