<script setup lang="ts">
import { computed } from 'vue'
import {
  PhCurrencyDollar,
  PhShoppingBagOpen,
  PhUsers,
  PhChartLineUp,
  PhTrendUp,
  PhTrendDown,
  PhWarning,
} from '@phosphor-icons/vue'

interface Stat {
  label: string
  value: string
  delta: string
  trend: 'up' | 'down'
  icon: typeof PhCurrencyDollar
}

const stats: Stat[] = [
  { label: 'Total Revenue', value: '$48,920.00', delta: '+12.4% vs last month', trend: 'up', icon: PhCurrencyDollar },
  { label: 'Orders This Month', value: '342', delta: '+18 vs last month', trend: 'up', icon: PhShoppingBagOpen },
  { label: 'New Customers', value: '57', delta: '+5 this week', trend: 'up', icon: PhUsers },
  { label: 'Avg. Order Value', value: '$143.00', delta: '-2.1% vs last month', trend: 'down', icon: PhChartLineUp },
]

interface LowStockProduct {
  id: number
  name: string
  sku: string
  category: string
  stock: number
  threshold: number
}

const lowStockProducts: LowStockProduct[] = [
  { id: 5, name: 'Grooming Brush Kit', sku: 'PM-GBK-05', category: 'Grooming Kit', stock: 4, threshold: 10 },
  { id: 8, name: 'Feather Wand Toy', sku: 'PM-FWT-08', category: 'Toys', stock: 2, threshold: 15 },
  { id: 12, name: 'Salmon & Pumpkin Bites', sku: 'PM-SPB-12', category: 'Food & Nutrition', stock: 0, threshold: 20 },
  { id: 15, name: 'Deluxe Chew Rope', sku: 'PM-DCR-15', category: 'Toys', stock: 6, threshold: 12 },
]

function stockStatus(product: LowStockProduct) {
  if (product.stock === 0) return 'Out of Stock'
  if (product.stock <= product.threshold / 3) return 'Critical'
  return 'Low'
}

const sortedLowStock = computed(() => lowStockProducts.slice().sort((a, b) => a.stock - b.stock))
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Dashboard</h1>
    </div>

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

      <el-table :data="sortedLowStock" style="width: 100%">
        <el-table-column prop="name" label="Product">
          <template #default="{ row }">
            <span class="cell-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sku" label="SKU">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.sku }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="Category">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Stock">
          <template #default="{ row }">{{ row.stock }} / {{ row.threshold }}</template>
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
