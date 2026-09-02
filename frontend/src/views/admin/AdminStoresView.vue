<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchStoresForAdmin, setStoreStatus, type StoreWithStats } from '@/lib/stores'

const stores = ref<StoreWithStats[]>([])
const loading = ref(true)
const loadError = ref(false)
const workingId = ref<number | null>(null)

const searchQuery = ref('')

const filteredStores = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return stores.value
  return stores.value.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.slug.toLowerCase().includes(query) ||
      (s.owner?.full_name ?? '').toLowerCase().includes(query) ||
      (s.owner?.email ?? '').toLowerCase().includes(query),
  )
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadStores() {
  loading.value = true
  loadError.value = false
  try {
    stores.value = await fetchStoresForAdmin()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function toggleBan(store: StoreWithStats) {
  const banning = store.status === 'active'
  try {
    await ElMessageBox.confirm(
      banning
        ? `Ban "${store.name}"? Its owner will be signed out of store management and the store will be hidden from the storefront until unbanned.`
        : `Unban "${store.name}"? The owner regains store management access and the store reappears on the storefront.`,
      banning ? 'Ban Store' : 'Unban Store',
      {
        confirmButtonText: banning ? 'Ban' : 'Unban',
        cancelButtonText: 'Cancel',
        type: banning ? 'warning' : 'info',
      },
    )
  } catch {
    return
  }

  workingId.value = store.id
  try {
    const updated = await setStoreStatus(store.id, banning ? 'banned' : 'active')
    store.status = updated.status
    ElMessage.success(banning ? 'Store banned' : 'Store unbanned')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not update this store')
  } finally {
    workingId.value = null
  }
}

onMounted(loadStores)
</script>

<template>
  <div class="admin-stores">
    <div class="page-header">
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Stores</h1>
    </div>

    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="Search by store, owner, or email"
        size="large"
        class="search-input"
      >
        <template #prefix>
          <PhMagnifyingGlass :size="16" />
        </template>
      </el-input>
      <span class="result-count">{{ filteredStores.length }} Stores</span>
    </div>

    <div v-if="loading" class="table-card skeleton-card">
      <el-skeleton v-for="n in 6" :key="n" animated class="skeleton-row">
        <template #template>
          <el-skeleton-item variant="text" class="sk-cell sk-cell--store" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--owner" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--products" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--orders" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--created" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--status" />
          <el-skeleton-item variant="button" class="sk-cell sk-cell--action" />
        </template>
      </el-skeleton>
    </div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load stores right now. Please try again shortly.
    </div>
    <div v-else class="table-card">
      <el-table
        :data="filteredStores"
        style="width: 100%"
        :empty-text="stores.length === 0 ? 'No stores yet.' : 'No stores match your search.'"
      >
        <el-table-column label="Store" min-width="180">
          <template #default="{ row }">
            <RouterLink :to="`/store/${row.slug}`" class="cell-name" target="_blank">{{ row.name }}</RouterLink>
            <p class="cell-sub">/store/{{ row.slug }}</p>
          </template>
        </el-table-column>
        <el-table-column label="Owner" min-width="180">
          <template #default="{ row }">
            <span class="cell-name">{{ row.owner?.full_name ?? '—' }}</span>
            <p class="cell-sub">{{ row.owner?.email ?? '—' }}</p>
          </template>
        </el-table-column>
        <el-table-column label="Products" width="110">
          <template #default="{ row }">{{ row.product_count }}</template>
        </el-table-column>
        <el-table-column label="Orders" width="100">
          <template #default="{ row }">{{ row.order_count }}</template>
        </el-table-column>
        <el-table-column label="Created" min-width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Status" width="110">
          <template #default="{ row }">
            <span class="status-badge" :class="`is-${row.status}`">{{
              row.status === 'banned' ? 'Banned' : 'Active'
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="" min-width="110">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 'active' ? 'danger' : 'primary'"
              :loading="workingId === row.id"
              @click="toggleBan(row)"
            >
              {{ row.status === 'active' ? 'Ban' : 'Unban' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.admin-stores {
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
  padding: 2.5rem 0;
  text-align: center;
  color: var(--color-text);
  opacity: 0.65;
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

.sk-cell--store {
  width: 150px;
}

.sk-cell--owner {
  width: 150px;
}

.sk-cell--products {
  width: 60px;
}

.sk-cell--orders {
  width: 60px;
}

.sk-cell--created {
  width: 90px;
}

.sk-cell--status {
  width: 70px;
}

.sk-cell--action {
  width: 80px;
  margin-left: auto;
}

.cell-name {
  color: var(--color-heading);
  font-weight: 600;
  text-decoration: none;
}

a.cell-name:hover {
  color: var(--color-accent);
}

.cell-sub {
  font-size: 0.78rem;
  opacity: 0.65;
  margin-top: 0.15rem;
}

.status-badge {
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

.status-badge.is-banned {
  background: #fbeaea;
  color: #c92a2a;
}

@media (prefers-color-scheme: dark) {
  .status-badge {
    background: rgba(47, 158, 68, 0.18);
    color: #82d996;
  }

  .status-badge.is-banned {
    background: rgba(201, 42, 42, 0.18);
    color: #f1a3a3;
  }
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
