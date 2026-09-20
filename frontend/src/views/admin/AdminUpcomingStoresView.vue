<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PhPlus } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createUpcomingStore,
  deleteUpcomingStore,
  fetchUpcomingStores,
  updateUpcomingStore,
  type UpcomingStore,
} from '@/lib/upcomingStores'

const stores = ref<UpcomingStore[]>([])
const loading = ref(true)
const loadError = ref(false)
const workingId = ref<number | null>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function loadStores() {
  loading.value = true
  loadError.value = false
  try {
    stores.value = await fetchUpcomingStores()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadStores)

const dialogVisible = ref(false)
const editTarget = ref<UpcomingStore | null>(null)
const saving = ref(false)

function emptyForm() {
  return { name: '', logo_url: '', description: '', launch_date: '', sort_order: 0 }
}

const form = ref(emptyForm())

function openCreateDialog() {
  editTarget.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEditDialog(store: UpcomingStore) {
  editTarget.value = store
  form.value = {
    name: store.name,
    logo_url: store.logo_url ?? '',
    description: store.description ?? '',
    launch_date: store.launch_date ?? '',
    sort_order: store.sort_order,
  }
  dialogVisible.value = true
}

async function saveStore() {
  if (!form.value.name.trim()) {
    ElMessage.error('Store name is required')
    return
  }

  const input = {
    name: form.value.name.trim(),
    logo_url: form.value.logo_url.trim() || null,
    description: form.value.description.trim() || null,
    launch_date: form.value.launch_date || null,
    sort_order: form.value.sort_order,
  }

  saving.value = true
  try {
    if (editTarget.value) {
      const updated = await updateUpcomingStore(editTarget.value.id, input)
      const idx = stores.value.findIndex((s) => s.id === updated.id)
      if (idx !== -1) stores.value[idx] = updated
      ElMessage.success('Upcoming store updated')
    } else {
      const created = await createUpcomingStore(input)
      stores.value.unshift(created)
      ElMessage.success('Upcoming store added')
    }
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not save this upcoming store')
  } finally {
    saving.value = false
  }
}

async function handleDelete(store: UpcomingStore) {
  try {
    await ElMessageBox.confirm(
      `Remove "${store.name}" from the upcoming stores list?`,
      'Remove Upcoming Store',
      {
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  workingId.value = store.id
  try {
    await deleteUpcomingStore(store.id)
    stores.value = stores.value.filter((s) => s.id !== store.id)
    ElMessage.success('Upcoming store removed')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not remove this upcoming store')
  } finally {
    workingId.value = null
  }
}
</script>

<template>
  <div class="admin-upcoming-stores">
    <div class="page-header">
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Upcoming Stores</h1>
    </div>

    <div class="toolbar">
      <p class="toolbar-hint">
        Shown as a "Coming Soon" list under the Store filter on the shop page — no store account or
        products required.
      </p>
      <el-button type="primary" @click="openCreateDialog">
        <PhPlus :size="16" style="margin-right: 0.35rem" />
        Add Upcoming Store
      </el-button>
    </div>

    <div v-if="loading" class="table-card skeleton-card">
      <el-skeleton v-for="n in 4" :key="n" animated class="skeleton-row">
        <template #template>
          <el-skeleton-item variant="text" class="sk-cell sk-cell--name" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--launch" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--created" />
          <el-skeleton-item variant="button" class="sk-cell sk-cell--action" />
        </template>
      </el-skeleton>
    </div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load upcoming stores right now. Please try again shortly.
    </div>
    <div v-else class="table-card">
      <el-table :data="stores" style="width: 100%" empty-text="No upcoming stores yet.">
        <el-table-column label="Store" min-width="200">
          <template #default="{ row }">
            <span class="cell-name">{{ row.name }}</span>
            <p v-if="row.description" class="cell-sub">{{ row.description }}</p>
          </template>
        </el-table-column>
        <el-table-column label="Launch Date" min-width="130">
          <template #default="{ row }">{{
            row.launch_date ? formatDate(row.launch_date) : '—'
          }}</template>
        </el-table-column>
        <el-table-column label="Sort Order" width="110" prop="sort_order" />
        <el-table-column label="Added" min-width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="" min-width="150">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button size="small" @click="openEditDialog(row)">Edit</el-button>
              <el-button
                size="small"
                type="danger"
                :loading="workingId === row.id"
                @click="handleDelete(row)"
              >
                Remove
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editTarget ? 'Edit Upcoming Store' : 'Add Upcoming Store'"
      width="90%"
      class="store-dialog"
      align-center
    >
      <form class="store-form" @submit.prevent="saveStore">
        <div class="form-field">
          <label>Store Name</label>
          <el-input v-model="form.name" placeholder="e.g. Meow Haven" />
        </div>
        <div class="form-field">
          <label>Logo URL</label>
          <el-input v-model="form.logo_url" placeholder="https://…" />
        </div>
        <div class="form-field">
          <label>Description</label>
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="Optional" />
        </div>
        <div class="form-field">
          <label>Launch Date</label>
          <el-date-picker
            v-model="form.launch_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Optional"
            style="width: 100%"
          />
        </div>
        <div class="form-field">
          <label>Sort Order</label>
          <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" />
        </div>
      </form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="saveStore">
          {{ editTarget ? 'Save Changes' : 'Add Store' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
:deep(.store-dialog) {
  max-width: 460px;
}

.admin-upcoming-stores {
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

.toolbar-hint {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  max-width: 480px;
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

.sk-cell--name {
  width: 180px;
}

.sk-cell--launch {
  width: 110px;
}

.sk-cell--created {
  width: 90px;
}

.sk-cell--action {
  width: 100px;
  margin-left: auto;
}

.cell-name {
  color: var(--color-heading);
  font-weight: 600;
}

.cell-sub {
  font-size: 0.78rem;
  opacity: 0.65;
  margin-top: 0.15rem;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
}

.store-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-field label {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
}

@media (max-width: 560px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
