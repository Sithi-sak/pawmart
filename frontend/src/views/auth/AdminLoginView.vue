<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhEye, PhEyeClosed } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'

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
  submitting.value = true
  try {
    await auth.signInAdmin(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    router.push(redirect)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to sign in.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-form">
    <h1 class="auth-title">Admin Sign In</h1>
    <p class="auth-subtitle">Store administration access only.</p>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="email">Email Address</label>
        <input id="email" v-model="form.email" type="email" placeholder="admin@pawmart.com" required />
      </div>

      <div class="form-field">
        <label for="password">Password</label>
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
  margin-top: -0.75rem;
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
</style>
