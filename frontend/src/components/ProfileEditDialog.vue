<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { cambodiaAddressOptions, formatLocation, parseLocation } from '@/lib/cambodiaAddress'

// Shared by the account page ("Complete profile" hint) and the settings page.
const open = defineModel<boolean>({ required: true })

const auth = useAuthStore()

const profileEmail = computed(() => auth.customer?.email ?? auth.user?.email ?? '')

const isSaving = ref(false)

const form = reactive({
  name: '',
  phone: '',
  provinceCode: '',
  districtCode: '',
})

const districtOptions = computed(
  () => cambodiaAddressOptions.find((p) => p.value === form.provinceCode)?.children ?? [],
)

// Refill from the saved profile every time the dialog opens, so a cancelled
// edit doesn't leave stale values behind for next time.
watch(open, (isOpen) => {
  if (!isOpen) return
  const { provinceCode, districtCode } = parseLocation(auth.customer?.location?.trim() ?? '')
  Object.assign(form, {
    name: auth.customer?.full_name ?? '',
    phone: auth.customer?.phone?.trim() ?? '',
    provinceCode,
    districtCode,
  })
})

function handleProvinceChange() {
  form.districtCode = ''
}

async function save() {
  const name = form.name.trim()
  if (!name) {
    ElMessage.error('Please enter your name')
    return
  }

  isSaving.value = true
  try {
    await auth.updateProfile({
      full_name: name,
      phone: form.phone.trim() || null,
      location: formatLocation(form.provinceCode, form.districtCode) || null,
    })
    open.value = false
    ElMessage.success('Profile updated')
  } catch {
    ElMessage.error('Could not save your profile. Try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="open"
    title="Edit Profile"
    width="min(560px, 92vw)"
    class="profile-dialog"
    modal-class="profile-dialog-overlay"
    :close-on-click-modal="!isSaving"
    :close-on-press-escape="!isSaving"
  >
    <form id="profile-edit-form" class="profile-edit-form" @submit.prevent="save">
      <div class="form-row">
        <div class="form-field">
          <label for="profile-name">Full Name</label>
          <input
            id="profile-name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
          />
        </div>
        <div class="form-field">
          <label for="profile-phone">Phone Number</label>
          <input
            id="profile-phone"
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            placeholder="e.g. 012 345 678"
          />
        </div>
      </div>

      <div class="form-field">
        <label for="profile-email">Email</label>
        <input id="profile-email" :value="profileEmail" type="email" readonly disabled />
        <span class="field-note"
          >Your email is linked to your sign-in and can't be changed here.</span
        >
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="profile-province">Province</label>
          <el-select
            id="profile-province"
            v-model="form.provinceCode"
            filterable
            clearable
            placeholder="Select province"
            @change="handleProvinceChange"
          >
            <el-option
              v-for="province in cambodiaAddressOptions"
              :key="province.value"
              :label="province.label"
              :value="province.value"
            />
          </el-select>
        </div>
        <div class="form-field">
          <label for="profile-district">District / Khan</label>
          <el-select
            id="profile-district"
            v-model="form.districtCode"
            filterable
            clearable
            placeholder="Select district"
            :disabled="!form.provinceCode"
          >
            <el-option
              v-for="district in districtOptions"
              :key="district.value"
              :label="district.label"
              :value="district.value"
            />
          </el-select>
        </div>
      </div>
    </form>

    <!-- Actions live in the dialog footer so they stay pinned on phones
         while the form scrolls; the submit button targets the form by id. -->
    <template #footer>
      <div class="dialog-actions">
        <button type="button" class="cancel-btn" :disabled="isSaving" @click="open = false">
          Cancel
        </button>
        <button type="submit" form="profile-edit-form" class="save-btn" :disabled="isSaving">
          {{ isSaving ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.profile-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
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

.profile-edit-form input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-note {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.profile-edit-form :deep(.el-select) {
  width: 100%;
}

.profile-edit-form :deep(.el-select__wrapper) {
  min-height: 2.6rem;
  border-radius: 0;
  background: var(--color-background-soft);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.profile-edit-form :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.dialog-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn,
.cancel-btn {
  height: 2.9rem;
  padding: 0 1.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.save-btn {
  background: var(--color-accent);
  border: none;
  color: #fff;
}

.save-btn:hover {
  background: var(--color-accent-dark);
}

.cancel-btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
}

.cancel-btn:hover {
  border-color: var(--color-accent);
}

@media (max-width: 768px) {
  .profile-edit-form {
    gap: 1.1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 1.1rem;
  }

  /* 48px touch targets. */
  .form-field input {
    height: 3rem;
  }

  .profile-edit-form :deep(.el-select__wrapper) {
    min-height: 3rem;
  }

  .dialog-actions button {
    flex: 1;
    height: 3rem;
    padding: 0 1rem;
  }
}
</style>

<!-- The dialog is teleported to <body>, so its shell can't be reached from
     scoped styles. On phones it becomes a bottom sheet: full width, rounded
     top, scrollable body and a footer pinned above the home indicator. -->
<style>
@media (max-width: 768px) {
  .profile-dialog-overlay .el-overlay-dialog {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* The keyboard vars only exist while it's open (see lib/keyboard.ts); on
     iOS they lift the sheet so the footer sits right on top of it. */
  .el-dialog.profile-dialog {
    width: 100% !important;
    max-width: none;
    margin: auto 0 var(--keyboard-inset, 0px) !important;
    max-height: calc(var(--visual-height, 100dvh) - env(safe-area-inset-top, 0px) - 1.5rem);
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 16px 16px 0 0;
  }

  .profile-dialog .el-dialog__header {
    padding: 1.1rem 3.5rem 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .profile-dialog .el-dialog__headerbtn {
    width: 3.5rem;
    height: 3.5rem;
  }

  .profile-dialog .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    padding: 1.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .profile-dialog .el-dialog__footer {
    padding: 0.75rem 1.25rem calc(0.75rem + var(--safe-bottom));
    border-top: 1px solid var(--color-border);
  }

  /* The keyboard covers the home indicator, so no need to clear it. */
  html.keyboard-open .profile-dialog .el-dialog__footer {
    padding-bottom: 0.75rem;
  }

  /* Slide up from the bottom edge instead of Element Plus's drop-in. */
  .dialog-fade-enter-active.profile-dialog-overlay .el-overlay-dialog {
    animation: profile-sheet-in var(--el-transition-duration);
  }

  .dialog-fade-leave-active.profile-dialog-overlay .el-overlay-dialog {
    animation: profile-sheet-out var(--el-transition-duration);
  }
}

@keyframes profile-sheet-in {
  from {
    transform: translateY(100%);
  }
}

@keyframes profile-sheet-out {
  to {
    transform: translateY(100%);
  }
}
</style>
