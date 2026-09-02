<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  approveStoreApplication,
  fetchStoreApplications,
  rejectStoreApplication,
  slugify,
  type ApproveResult,
  type StoreApplication,
  type StoreApplicationStatus,
} from '@/lib/storeApplications'

const STATUS_LABELS: Record<StoreApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const auth = useAuthStore()
const applications = ref<StoreApplication[]>([])
const loading = ref(true)
const loadError = ref(false)
const activeStatus = ref<StoreApplicationStatus | 'All'>('pending')
const workingId = ref<number | null>(null)

const filteredApplications = computed(() => {
  if (activeStatus.value === 'All') return applications.value
  return applications.value.filter((a) => a.status === activeStatus.value)
})

function statusCount(status: StoreApplicationStatus) {
  return applications.value.filter((a) => a.status === status).length
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadApplications() {
  loading.value = true
  loadError.value = false
  try {
    applications.value = await fetchStoreApplications()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const approveDialogVisible = ref(false)
const approveTarget = ref<StoreApplication | null>(null)
const approveForm = ref({ store_name: '', store_slug: '' })

function openApproveDialog(application: StoreApplication) {
  approveTarget.value = application
  approveForm.value = {
    store_name: application.store_name,
    store_slug: slugify(application.store_name),
  }
  approveDialogVisible.value = true
}

const credentialsDialogVisible = ref(false)
const credentials = ref<ApproveResult | null>(null)

async function confirmApprove() {
  if (!approveTarget.value || !auth.session) return
  workingId.value = approveTarget.value.id
  try {
    const result = await approveStoreApplication(
      approveTarget.value.id,
      approveForm.value,
      auth.session.access_token,
    )
    approveTarget.value.status = 'approved'
    approveDialogVisible.value = false
    credentials.value = result
    credentialsDialogVisible.value = true
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not approve this request')
  } finally {
    workingId.value = null
  }
}

async function handleReject(application: StoreApplication) {
  if (!auth.customer) return
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      `Reject the request from "${application.contact_name}"? You can add a note (optional).`,
      'Reject Request',
      { confirmButtonText: 'Reject', cancelButtonText: 'Cancel', inputPlaceholder: 'Reason (optional)' },
    )
    reason = value
  } catch {
    return
  }

  workingId.value = application.id
  try {
    await rejectStoreApplication(application.id, reason || undefined, auth.customer.id)
    application.status = 'rejected'
    application.rejection_reason = reason || null
    ElMessage.success('Request rejected')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not reject this request')
  } finally {
    workingId.value = null
  }
}

async function copyPassword() {
  if (!credentials.value) return
  await navigator.clipboard.writeText(credentials.value.temp_password)
  ElMessage.success('Password copied')
}

onMounted(loadApplications)
</script>

<template>
  <div class="admin-requests">
    <div class="page-header">
      <p class="eyebrow">Admin</p>
      <h1 class="page-title">Seller Requests</h1>
    </div>

    <div class="filter-row">
      <button
        type="button"
        class="filter-pill"
        :class="{ 'is-active': activeStatus === 'All' }"
        @click="activeStatus = 'All'"
      >
        All ({{ applications.length }})
      </button>
      <button
        v-for="s in (['pending', 'approved', 'rejected'] as StoreApplicationStatus[])"
        :key="s"
        type="button"
        class="filter-pill"
        :class="{ 'is-active': activeStatus === s }"
        @click="activeStatus = s"
      >
        {{ STATUS_LABELS[s] }} ({{ statusCount(s) }})
      </button>
    </div>

    <div v-if="loading" class="table-card skeleton-card">
      <el-skeleton v-for="n in 6" :key="n" animated class="skeleton-row">
        <template #template>
          <el-skeleton-item variant="text" class="sk-cell sk-cell--applicant" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--store" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--message" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--submitted" />
          <el-skeleton-item variant="text" class="sk-cell sk-cell--status" />
          <el-skeleton-item variant="button" class="sk-cell sk-cell--actions" />
        </template>
      </el-skeleton>
    </div>
    <div v-else-if="loadError" class="state-message">
      Couldn't load seller requests right now. Please try again shortly.
    </div>
    <div v-else class="table-card">
      <el-table
        :data="filteredApplications"
        style="width: 100%"
        :empty-text="applications.length === 0 ? 'No seller requests yet.' : 'No requests match this filter.'"
      >
        <el-table-column label="Applicant" min-width="180">
          <template #default="{ row }">
            <span class="cell-name">{{ row.contact_name }}</span>
            <p class="cell-sub">{{ row.email }}<span v-if="row.phone"> · {{ row.phone }}</span></p>
          </template>
        </el-table-column>
        <el-table-column label="Proposed Store" prop="store_name" min-width="160" />
        <el-table-column label="Message" min-width="220">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.message || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Submitted" min-width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Status" min-width="110">
          <template #default="{ row }">
            <span class="status-badge" :class="`is-${row.status}`">{{ STATUS_LABELS[row.status] }}</span>
          </template>
        </el-table-column>
        <el-table-column label="" min-width="180">
          <template #default="{ row }">
            <div v-if="row.status === 'pending'" class="row-actions">
              <el-button
                size="small"
                type="primary"
                :loading="workingId === row.id"
                @click="openApproveDialog(row)"
              >
                Approve
              </el-button>
              <el-button size="small" :loading="workingId === row.id" @click="handleReject(row)">
                Reject
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="approveDialogVisible" title="Approve Seller Request" width="420px" align-center>
      <form class="approve-form" @submit.prevent="confirmApprove">
        <div class="form-field">
          <label>Store Name</label>
          <el-input v-model="approveForm.store_name" />
        </div>
        <div class="form-field">
          <label>Store URL Slug</label>
          <el-input v-model="approveForm.store_slug" />
          <p class="field-hint">/store/{{ approveForm.store_slug || '…' }}</p>
        </div>
      </form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="workingId === approveTarget?.id" @click="confirmApprove">
          Approve &amp; Create Store
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="credentialsDialogVisible" title="Store Owner Created" width="440px" align-center>
      <p class="credentials-warning">
        Copy this password now — it's shown only once. Relay it to the seller yourself; they
        should change it after first login.
      </p>
      <div v-if="credentials" class="credentials-block">
        <div class="credential-row">
          <span class="credential-label">Email</span>
          <span class="credential-value">{{ credentials.email }}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password</span>
          <span class="credential-value credential-password">{{ credentials.temp_password }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="copyPassword">Copy Password</el-button>
        <el-button type="primary" @click="credentialsDialogVisible = false">Done</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-requests {
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

.sk-cell--applicant {
  width: 150px;
}

.sk-cell--store {
  width: 130px;
}

.sk-cell--message {
  width: 200px;
}

.sk-cell--submitted {
  width: 90px;
}

.sk-cell--status {
  width: 70px;
}

.sk-cell--actions {
  width: 90px;
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

.cell-muted {
  opacity: 0.65;
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
  background: #fbf0e9;
  color: var(--color-accent-dark);
}

.status-badge.is-approved {
  background: #ebf7ee;
  color: #2f9e44;
}

.status-badge.is-rejected {
  background: #fbeaea;
  color: #c92a2a;
}

@media (prefers-color-scheme: dark) {
  .status-badge {
    background: rgba(218, 109, 31, 0.18);
    color: #edb68f;
  }

  .status-badge.is-approved {
    background: rgba(47, 158, 68, 0.18);
    color: #82d996;
  }

  .status-badge.is-rejected {
    background: rgba(201, 42, 42, 0.18);
    color: #f1a3a3;
  }
}

.row-actions {
  display: flex;
  gap: 0.5rem;
}

.approve-form {
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

.field-hint {
  font-size: 0.78rem;
  opacity: 0.6;
}

.credentials-warning {
  font-size: 0.85rem;
  color: var(--color-accent-dark);
  margin-bottom: 1rem;
}

.credentials-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.credential-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.credential-label {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.65;
}

.credential-value {
  font-family: monospace;
  font-size: 0.9rem;
}

.credential-password {
  font-weight: 700;
}
</style>
