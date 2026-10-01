<script setup lang="ts">
import { computed, reactive, ref, type Component } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  PhCaretRight,
  PhFileText,
  PhHeart,
  PhInfo,
  PhLockKey,
  PhPawPrint,
  PhReceipt,
  PhShieldCheck,
  PhSignOut,
  PhStorefront,
  PhUserCircle,
} from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import ProfileEditDialog from '@/components/ProfileEditDialog.vue'

const auth = useAuthStore()
const router = useRouter()

const profileName = computed(() => auth.customer?.full_name?.trim() || 'PawMart Member')
const profileEmail = computed(() => auth.customer?.email ?? auth.user?.email ?? '')

const initials = computed(() => {
  const words = profileName.value.split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : ''
  return (last ? first.charAt(0) + last.charAt(0) : first.slice(0, 2)).toUpperCase()
})

interface SettingsLink {
  label: string
  icon: Component
  to: string
}

const shoppingLinks: SettingsLink[] = [
  { label: 'My Orders', icon: PhReceipt, to: '/account/orders' },
  { label: 'My Pets', icon: PhPawPrint, to: '/account/pets' },
  { label: 'Wishlist', icon: PhHeart, to: '/wishlist' },
]

const sellingLink = computed<SettingsLink>(() =>
  auth.isStoreOwner
    ? { label: 'Seller Dashboard', icon: PhStorefront, to: '/store/manage' }
    : { label: 'Become a Seller', icon: PhStorefront, to: '/sell' },
)

const aboutLinks: SettingsLink[] = [
  { label: 'About PawMart', icon: PhInfo, to: '/about' },
  { label: 'Privacy Policy', icon: PhShieldCheck, to: '/privacy' },
  { label: 'Terms of Service', icon: PhFileText, to: '/terms' },
]

const isEditingProfile = ref(false)

// Change password -- same 8-character minimum as the reset-password page.
const MIN_PASSWORD_LENGTH = 8
const isChangingPassword = ref(false)
const isSavingPassword = ref(false)
const passwordForm = reactive({ password: '', confirmPassword: '' })

const passwordError = computed(() => {
  if (passwordForm.password && passwordForm.password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (passwordForm.confirmPassword && passwordForm.password !== passwordForm.confirmPassword)
    return "Passwords don't match."
  return ''
})

const canSavePassword = computed(
  () =>
    passwordForm.password.length >= MIN_PASSWORD_LENGTH &&
    passwordForm.password === passwordForm.confirmPassword,
)

function openChangePassword() {
  Object.assign(passwordForm, { password: '', confirmPassword: '' })
  isChangingPassword.value = true
}

async function savePassword() {
  if (!canSavePassword.value) return
  isSavingPassword.value = true
  try {
    await auth.updatePassword(passwordForm.password)
    isChangingPassword.value = false
    ElMessage.success('Password updated')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Could not update your password.')
  } finally {
    isSavingPassword.value = false
  }
}

async function handleSignOut() {
  try {
    await ElMessageBox.confirm('Sign out of PawMart on this device?', 'Sign Out', {
      confirmButtonText: 'Sign Out',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
  } catch {
    return
  }
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="settings">
    <h1 class="page-title">Settings</h1>

    <div class="profile-card">
      <div class="profile-avatar" aria-hidden="true">{{ initials }}</div>
      <div class="profile-text">
        <p class="profile-name">{{ profileName }}</p>
        <p class="profile-email">{{ profileEmail }}</p>
      </div>
    </div>

    <section class="settings-group">
      <h2 class="group-title">Account</h2>
      <ul class="settings-list">
        <li>
          <button type="button" class="settings-row" @click="isEditingProfile = true">
            <PhUserCircle :size="20" class="row-icon" />
            <span class="row-label">Edit Profile</span>
            <PhCaretRight :size="16" class="row-caret" />
          </button>
        </li>
        <li>
          <button type="button" class="settings-row" @click="openChangePassword">
            <PhLockKey :size="20" class="row-icon" />
            <span class="row-label">Change Password</span>
            <PhCaretRight :size="16" class="row-caret" />
          </button>
        </li>
      </ul>
    </section>

    <section class="settings-group">
      <h2 class="group-title">Shopping</h2>
      <ul class="settings-list">
        <li v-for="link in shoppingLinks" :key="link.to">
          <RouterLink :to="link.to" class="settings-row">
            <component :is="link.icon" :size="20" class="row-icon" />
            <span class="row-label">{{ link.label }}</span>
            <PhCaretRight :size="16" class="row-caret" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="settings-group">
      <h2 class="group-title">Selling</h2>
      <ul class="settings-list">
        <li>
          <RouterLink :to="sellingLink.to" class="settings-row">
            <component :is="sellingLink.icon" :size="20" class="row-icon" />
            <span class="row-label">{{ sellingLink.label }}</span>
            <PhCaretRight :size="16" class="row-caret" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="settings-group">
      <h2 class="group-title">About</h2>
      <ul class="settings-list">
        <li v-for="link in aboutLinks" :key="link.to">
          <RouterLink :to="link.to" class="settings-row">
            <component :is="link.icon" :size="20" class="row-icon" />
            <span class="row-label">{{ link.label }}</span>
            <PhCaretRight :size="16" class="row-caret" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <button type="button" class="sign-out-btn" @click="handleSignOut">
      <PhSignOut :size="18" />
      Sign Out
    </button>

    <ProfileEditDialog v-model="isEditingProfile" />

    <el-dialog
      v-model="isChangingPassword"
      title="Change Password"
      width="min(440px, 92vw)"
      :close-on-click-modal="!isSavingPassword"
    >
      <form class="password-form" @submit.prevent="savePassword">
        <div class="form-field">
          <label for="new-password">New Password</label>
          <input
            id="new-password"
            v-model="passwordForm.password"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="form-field">
          <label for="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="passwordForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

        <div class="dialog-actions">
          <button
            type="button"
            class="cancel-btn"
            :disabled="isSavingPassword"
            @click="isChangingPassword = false"
          >
            Cancel
          </button>
          <button type="submit" class="save-btn" :disabled="!canSavePassword || isSavingPassword">
            {{ isSavingPassword ? 'Saving…' : 'Update Password' }}
          </button>
        </div>
      </form>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem 0 4rem;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.profile-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 1.25rem;
}

.profile-text {
  min-width: 0;
}

.profile-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-heading);
}

.profile-email {
  font-size: 0.82rem;
  opacity: 0.65;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-group {
  margin-bottom: 1.75rem;
}

.group-title {
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.5rem;
}

.settings-list {
  list-style: none;
  padding: 0;
  border: 1px solid var(--color-border);
}

.settings-list li + li {
  border-top: 1px solid var(--color-border);
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1rem;
  background: var(--color-background);
  border: none;
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.92rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.settings-row:hover {
  background: var(--color-background-soft);
}

.row-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.row-label {
  flex: 1;
}

.row-caret {
  flex-shrink: 0;
  opacity: 0.4;
}

.sign-out-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 3rem;
  margin-top: 0.5rem;
  background: var(--color-background);
  border: 1px solid #c0392b;
  color: #c0392b;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.sign-out-btn:hover {
  background: #c0392b;
  color: #fff;
}

/* Change password dialog */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.form-error {
  margin-top: -0.5rem;
  font-size: 0.8rem;
  color: #c0392b;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
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
  cursor: pointer;
}

.save-btn {
  background: var(--color-accent);
  border: none;
  color: #fff;
}

.save-btn:hover:not(:disabled) {
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
  .settings {
    padding: 0 0 2rem;
  }

  .page-title {
    font-size: 1.85rem;
    margin-bottom: 1.25rem;
  }

  .profile-card {
    margin-bottom: 1.5rem;
  }

  .settings-group {
    margin-bottom: 1.5rem;
  }

  .dialog-actions button {
    flex: 1;
  }
}
</style>
