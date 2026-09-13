<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { fetchOrders, updateOrderStatus, type OrderStatus, type OrderSummary } from '@/lib/orders'

const STATUSES: OrderStatus[] = [
  'confirmed',
  'processing',
  'shipping',
  'out_for_delivery',
  'delivered',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipping: 'Shipping',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

const PAYMENT_METHOD_LABELS = { visa: 'Visa', aba_payway: 'ABA PayWay', khqr: 'KHQR' }

const auth = useAuthStore()
const orders = ref<OrderSummary[]>([])
const loading = ref(true)
const loadError = ref(false)
const updatingId = ref<number | null>(null)

const searchQuery = ref('')
const activeStatus = ref<OrderStatus | 'All'>('All')

const filteredOrders = computed(() => {
  let result = orders.value

  if (activeStatus.value !== 'All') {
    result = result.filter((o) => o.status === activeStatus.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (o) =>
        o.order_number.toLowerCase().includes(query) ||
        (o.customer?.full_name ?? '').toLowerCase().includes(query) ||
        (o.customer?.email ?? '').toLowerCase().includes(query),
    )
  }

  return result
})

const pageSize = ref(10)
const currentPage = ref(1)

// Land back on a valid page whenever filtering shrinks the result set.
watch([activeStatus, searchQuery], () => {
  currentPage.value = 1
})

const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

function statusCount(status: OrderStatus) {
  return orders.value.filter((o) => o.status === status).length
}

// Orders only ever move forward (enforced backend-side too, see 3.3/3.8
// checkpoint notes) — so a status can only be advanced to a later step.
function nextStatusOptions(current: OrderStatus): OrderStatus[] {
  return STATUSES.slice(STATUSES.indexOf(current) + 1)
}

async function handleStatusChange(order: OrderSummary, nextStatus: OrderStatus) {
  if (!auth.session) return
  updatingId.value = order.id
  try {
    const updated = await updateOrderStatus(order.id, nextStatus, auth.session.access_token)
    order.status = updated.status
    ElMessage.success(`${order.order_number} updated to "${STATUS_LABELS[updated.status]}"`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not update order status')
  } finally {
    updatingId.value = null
  }
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(async () => {
  await auth.init()
  if (!auth.session) {
    loading.value = false
    loadError.value = true
    return
  }

  try {
    // Scoped to this store owner's own store's orders server-side (task
    // 3.10.3's list_orders), so no client-side filtering needed here.
    orders.value = await fetchOrders(auth.session.access_token)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="admin-orders">
    <div class="page-header">
      <p class="eyebrow">Store</p>
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
        v-for="s in STATUSES"
        :key="s"
        type="button"
        class="filter-pill"
        :class="{ 'is-active': activeStatus === s }"
        @click="activeStatus = s"
      >
        {{ STATUS_LABELS[s] }} ({{ statusCount(s) }})
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

    <div v-if="loading" class="table-card skeleton-card">
      <el-skeleton v-for="n in 6" :key="n" animated class="skeleton-row">
        <template #template>
          <el-skeleton-item variant="text" class="sk-cell sk-cell--order" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--customer" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--date" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--items" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--total" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--payment" />
          <el-skeleton-item variant="button" class="sk-cell sk-cell--status" />
        </template>
      </el-skeleton>
    </div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load orders right now. Please try again shortly.
    </div>
    <div v-else class="orders-body">
      <div class="table-card">
        <el-table
          :data="pagedOrders"
          height="100%"
          style="width: 100%"
          :empty-text="orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'"
        >
          <el-table-column prop="order_number" label="Order">
            <template #default="{ row }">
              <span class="cell-name">{{ row.order_number }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Customer">
            <template #default="{ row }">
              <span class="cell-muted">{{
                row.customer?.full_name ?? row.customer?.email ?? '—'
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Date">
            <template #default="{ row }">
              <span class="cell-muted">{{ formatDate(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="item_count" label="Items" />
          <el-table-column label="Total">
            <template #default="{ row }">{{ formatPrice(row.total) }}</template>
          </el-table-column>
          <el-table-column label="Payment" min-width="150">
            <template #default="{ row }">
              <p class="payment-method">
                {{ PAYMENT_METHOD_LABELS[row.payment_method as OrderSummary['payment_method']] }}
              </p>
              <span class="payment-badge">Paid</span>
            </template>
          </el-table-column>
          <el-table-column label="Status" min-width="190">
            <template #default="{ row }">
              <el-select
                :model-value="row.status"
                size="default"
                class="status-select"
                :disabled="updatingId === row.id || nextStatusOptions(row.status).length === 0"
                @change="(value: OrderStatus) => handleStatusChange(row, value)"
              >
                <el-option :label="STATUS_LABELS[row.status as OrderStatus]" :value="row.status" />
                <el-option
                  v-for="s in nextStatusOptions(row.status)"
                  :key="s"
                  :label="STATUS_LABELS[s]"
                  :value="s"
                />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="filteredOrders.length > 0" class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredOrders.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-orders {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  flex-shrink: 0;
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
  flex-shrink: 0;
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

.state-message {
  flex: 1;
  min-height: 0;
  padding: 2.5rem 0;
  text-align: center;
  color: var(--color-text);
  opacity: 0.65;
  overflow-y: auto;
}

.orders-body {
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

.pagination-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.skeleton-card {
  flex: 1;
  min-height: 0;
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

.sk-cell--order {
  width: 90px;
}

.sk-cell--customer {
  width: 130px;
}

.sk-cell--date {
  width: 90px;
}

.sk-cell--items {
  width: 40px;
}

.sk-cell--total {
  width: 60px;
}

.sk-cell--payment {
  width: 100px;
}

.sk-cell--status {
  width: 170px;
  margin-left: auto;
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

@media (prefers-color-scheme: dark) {
  .payment-badge {
    background: rgba(47, 158, 68, 0.18);
    color: #82d996;
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
