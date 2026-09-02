<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PhCurrencyDollar,
  PhShoppingBagOpen,
  PhUsers,
  PhChartLineUp,
  PhTrendUp,
  PhTrendDown,
} from '@phosphor-icons/vue'
import { fetchDashboardStats, type DashboardStats } from '@/lib/adminDashboard'

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

onMounted(async () => {
  loading.value = true
  loadError.value = false
  try {
    dashboardStats.value = await fetchDashboardStats()
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

    <div v-if="loading" class="stats-grid">
      <div v-for="n in 4" :key="n" class="stat-card">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" class="sk-stat-label" />
            <el-skeleton-item variant="h1" class="sk-stat-value" />
            <el-skeleton-item variant="text" class="sk-stat-delta" />
          </template>
        </el-skeleton>
      </div>
    </div>
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
