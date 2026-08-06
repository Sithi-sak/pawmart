<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhCaretLeft, PhEye, PhEyeClosed } from '@phosphor-icons/vue'

const router = useRouter()

const form = reactive({
  password: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const submitAttempted = ref(false)

const passwordsMismatch = computed(
  () => form.confirmPassword.length > 0 && form.password !== form.confirmPassword,
)

function handleSubmit() {
  submitAttempted.value = true
  if (form.password.length < 8 || form.password !== form.confirmPassword) return
  // Real password update lands with Supabase Auth wiring (task 2.3).
  router.push('/login')
}
</script>

<template>
  <div class="auth-form">
    <RouterLink to="/login" class="top-back-link">
      <PhCaretLeft :size="16" />
      Back to Login
    </RouterLink>

    <h1 class="auth-title">Reset Password</h1>
    <p class="auth-subtitle">Create a secure new password for your account.</p>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="password">New Password</label>
        <div class="input-with-icon">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter at least 8 characters"
            minlength="8"
            required
          />
          <button
            type="button"
            class="icon-toggle"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <PhEyeClosed v-if="showPassword" :size="20" />
            <PhEye v-else :size="20" />
          </button>
        </div>
      </div>

      <div class="form-field">
        <label for="confirmPassword">Confirm New Password</label>
        <div class="input-with-icon">
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Re-enter your password"
            minlength="8"
            required
          />
          <button
            type="button"
            class="icon-toggle"
            :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <PhEyeClosed v-if="showConfirmPassword" :size="20" />
            <PhEye v-else :size="20" />
          </button>
        </div>
        <p v-if="passwordsMismatch" class="field-error">Passwords do not match.</p>
      </div>

      <button type="submit" class="primary-btn">Set New Password</button>
    </form>

    <p class="help-note">
      Having trouble? <a href="#" class="help-link" @click.prevent>Contact support</a>
    </p>
  </div>
</template>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.top-back-link {
  position: absolute;
  top: 2rem;
  right: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
  text-decoration: none;
}

.top-back-link:hover {
  color: var(--color-accent);
}

.auth-title {
  font-size: 2.5rem;
  margin-bottom: 0.6rem;
}

.auth-subtitle {
  font-size: 0.95rem;
  color: var(--color-text);
  opacity: 0.75;
  margin-bottom: 2.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-field label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
}

.form-field input {
  height: 2.75rem;
  padding: 0 0.9rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
}

.form-field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-with-icon {
  position: relative;
}

.input-with-icon input {
  width: 100%;
  padding-right: 2.75rem;
}

.icon-toggle {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  background: none;
  border: none;
  padding: 0.25rem;
  color: var(--color-text);
  opacity: 0.55;
  cursor: pointer;
}

.icon-toggle:hover {
  opacity: 0.85;
}

.field-error {
  font-size: 0.8rem;
  color: var(--color-accent-dark);
}

.primary-btn {
  height: 3rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 0.5rem;
}

.primary-btn:hover {
  background: var(--color-accent-dark);
}

.help-note {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--color-text);
  opacity: 0.75;
}

.help-link {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: none;
}

.help-link:hover {
  text-decoration: underline;
}
</style>
