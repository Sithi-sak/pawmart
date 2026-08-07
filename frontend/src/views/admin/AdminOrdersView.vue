<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

type OrderStatus = 'Confirmed' | 'Processing' | 'Shipping' | 'Out for Delivery' | 'Delivered'

interface Order {
  id: number
  orderNumber: string
  customer: string
  date: string
  items: number
  total: number
  paymentMethod: 'Visa' | 'ABA PayWay' | 'KHQR'
  paymentStatus: 'Paid' | 'Pending Confirmation'
  status: OrderStatus
}

const statuses: OrderStatus[] = ['Confirmed', 'Processing', 'Shipping', 'Out for Delivery', 'Delivered']

const orders = reactive<Order[]>([
  { id: 1, orderNumber: 'PM-000128', customer: 'Sokha Chan', date: 'Aug 6, 2026', items: 3, total: 245.5, paymentMethod: 'KHQR', paymentStatus: 'Pending Confirmation', status: 'Confirmed' },
  { id: 2, orderNumber: 'PM-000127', customer: 'Dara Pich', date: 'Aug 6, 2026', items: 1, total: 96.0, paymentMethod: 'Visa', paymentStatus: 'Paid', status: 'Processing' },
  { id: 3, orderNumber: 'PM-000126', customer: 'Ranyi Sok', date: 'Aug 5, 2026', items: 2, total: 365.0, paymentMethod: 'ABA PayWay', paymentStatus: 'Paid', status: 'Shipping' },
  { id: 4, orderNumber: 'PM-000125', customer: 'Vibol Heng', date: 'Aug 5, 2026', items: 4, total: 512.0, paymentMethod: 'KHQR', paymentStatus: 'Pending Confirmation', status: 'Confirmed' },
  { id: 5, orderNumber: 'PM-000124', customer: 'Chanthy Kim', date: 'Aug 4, 2026', items: 1, total: 22.0, paymentMethod: 'Visa', paymentStatus: 'Paid', status: 'Out for Delivery' },
  { id: 6, orderNumber: 'PM-000123', customer: 'Bopha Long', date: 'Aug 3, 2026', items: 2, total: 180.0, paymentMethod: 'ABA PayWay', paymentStatus: 'Paid', status: 'Delivered' },
  { id: 7, orderNumber: 'PM-000122', customer: 'Sovann Mao', date: 'Aug 3, 2026', items: 1, total: 54.0, paymentMethod: 'Visa', paymentStatus: 'Paid', status: 'Delivered' },
])

const searchQuery = ref('')
const activeStatus = ref<OrderStatus | 'All'>('All')

const filteredOrders = computed(() => {
  let result = orders as Order[]

  if (activeStatus.value !== 'All') {
    result = result.filter((o) => o.status === activeStatus.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (o) => o.orderNumber.toLowerCase().includes(query) || o.customer.toLowerCase().includes(query),
    )
  }

  return result
})

function statusCount(status: OrderStatus) {
  return orders.filter((o) => o.status === status).length
}

function updateStatus(order: Order, status: OrderStatus) {
  order.status = status
  ElMessage.success(`${order.orderNumber} updated to "${status}"`)
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <div class="admin-orders">
    <div class="page-header">
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Orders</h1>
    </div>

    <div class="filter-row">
      <button
        type="button"
        class="filter-pill"
        :class="{ 'is-active': activeStatus === 'All' }"
        @click="activeStatus = 'All'"
      >
        All ({{ orders.length }})
      </button>
      <button
        v-for="s in statuses"
        :key="s"
        type="button"
        class="filter-pill"
        :class="{ 'is-active': activeStatus === s }"
        @click="activeStatus = s"
      >
        {{ s }} ({{ statusCount(s) }})
      </button>
    </div>

    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="Search order number or customer"
        size="large"
        class="search-input"
      >
        <template #prefix>
          <PhMagnifyingGlass :size="16" />
        </template>
      </el-input>
      <span class="result-count">{{ filteredOrders.length }} Orders</span>
    </div>

    <div class="table-card">
      <el-table :data="filteredOrders" style="width: 100%" empty-text="No orders match your filters.">
        <el-table-column prop="orderNumber" label="Order">
          <template #default="{ row }">
            <span class="cell-name">{{ row.orderNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="Customer">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.customer }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="Date">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.date }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="items" label="Items" />
        <el-table-column label="Total">
          <template #default="{ row }">{{ formatPrice(row.total) }}</template>
        </el-table-column>
        <el-table-column label="Payment" min-width="150">
          <template #default="{ row }">
            <p class="payment-method">{{ row.paymentMethod }}</p>
            <span
              class="payment-badge"
              :class="{ 'is-pending': row.paymentStatus === 'Pending Confirmation' }"
            >
              {{ row.paymentStatus }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Status" min-width="190">
          <template #default="{ row }">
            <el-select
              :model-value="row.status"
              size="default"
              class="status-select"
              @change="(value: OrderStatus) => updateStatus(row, value)"
            >
              <el-option v-for="s in statuses" :key="s" :label="s" :value="s" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.admin-orders {
  padding-bottom: 2rem;
}

.page-header {
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

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.filter-pill {
  height: 2.2rem;
  padding: 0 0.9rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  cursor: pointer;
}

.filter-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.filter-pill.is-active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  font-weight: 600;
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

.payment-method {
  font-size: 0.85rem;
  color: var(--color-heading);
  margin-bottom: 0.3rem;
}

.payment-badge {
  display: inline-flex;
  align-items: center;
  height: 1.5rem;
  padding: 0 0.55rem;
  font-size: 0.65rem;
  letter-spacing: 0.03em;
  font-weight: 600;
  text-transform: uppercase;
  background: #ebf7ee;
  color: #2f9e44;
}

.payment-badge.is-pending {
  background: #fbf0e9;
  color: var(--color-accent-dark);
}

@media (prefers-color-scheme: dark) {
  .payment-badge {
    background: rgba(47, 158, 68, 0.18);
    color: #82d996;
  }

  .payment-badge.is-pending {
    background: rgba(218, 109, 31, 0.18);
    color: #edb68f;
  }
}

.status-select {
  width: 170px;
}

@media (max-width: 560px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: none;
  }
}
</style>
