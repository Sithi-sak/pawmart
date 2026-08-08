<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { PhEye, PhEyeClosed } from '@phosphor-icons/vue'
import GoogleLogo from '@/components/icons/GoogleLogo.vue'
import { isAllowedCustomerEmail, useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})

const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!isAllowedCustomerEmail(form.email)) {
    errorMessage.value = 'Please sign in with a Gmail address, or use Sign in with Google.'
    return
  }
  submitting.value = true
  try {
    await auth.signInWithPassword(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/account'
    router.push(redirect)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to sign in.'
  } finally {
    submitting.value = false
  }
}

async function handleGoogleSignIn() {
  errorMessage.value = ''
  try {
    await auth.signInWithGoogle()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to sign in with Google.'
  }
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-title">Welcome Back</h1>
    <p class="auth-subtitle">Sign in to continue to your PawMart account.</p>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="email">Email Address</label>
        <input id="email" v-model="form.email" type="email" placeholder="name@gmail.com" required />
      </div>

      <div class="form-field">
        <div class="field-header">
          <label for="password">Password</label>
          <RouterLink to="/forgot-password" class="inline-link">Forgot Password?</RouterLink>
        </div>
        <div class="input-with-icon">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
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

      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

      <button type="submit" class="primary-btn" :disabled="submitting">
        {{ submitting ? 'Signing In…' : 'Sign In' }}
      </button>
    </form>

    <div class="divider"><span>OR</span></div>

    <button type="button" class="oauth-btn" @click="handleGoogleSignIn">
      <GoogleLogo :size="20" />
      Sign in with Google
    </button>

    <p class="switch-note">
      Don't have an account? <RouterLink to="/signup">Create an account</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
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

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-field label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
}

.inline-link {
  font-size: 0.82rem;
  color: var(--color-accent);
  text-decoration: none;
}

.inline-link:hover {
  text-decoration: underline;
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

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-error {
  font-size: 0.8rem;
  color: var(--color-accent-dark);
  margin-top: -0.75rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.75rem 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.6;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  height: 3rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 0;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.oauth-btn:hover {
  border-color: var(--color-accent);
}

.switch-note {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--color-text);
}

.switch-note a {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: none;
}

.switch-note a:hover {
  text-decoration: underline;
}
</style>
