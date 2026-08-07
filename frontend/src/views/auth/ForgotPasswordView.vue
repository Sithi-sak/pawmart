<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhArrowLeft, PhX } from '@phosphor-icons/vue'
import { isAllowedCustomerEmail, useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const email = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const sent = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  if (!isAllowedCustomerEmail(email.value)) {
    errorMessage.value = 'Please use a Gmail address.'
    return
  }
  submitting.value = true
  try {
    await auth.sendPasswordReset(email.value)
    sent.value = true
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to send recovery email.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-form">
    <RouterLink to="/login" class="close-btn" aria-label="Close">
      <PhX :size="22" />
    </RouterLink>

    <h1 class="auth-title">Recover Account</h1>
    <p v-if="!sent" class="auth-subtitle">
      Enter your email address to receive recovery instructions.
    </p>
    <p v-else class="auth-subtitle">
      If an account exists for {{ email }}, we've sent a link to reset your password.
    </p>

    <form v-if="!sent" class="form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="email">Email Address</label>
        <input id="email" v-model="email" type="email" placeholder="your@email.com" required />
      </div>

      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

      <button type="submit" class="primary-btn" :disabled="submitting">
        {{ submitting ? 'Sending…' : 'Send' }}
      </button>
    </form>

    <div class="section-divider"></div>

    <RouterLink to="/login" class="back-link">
      <PhArrowLeft :size="16" />
      Back to Login
    </RouterLink>

    <div class="help-note">
      <p class="help-label">Need Help?</p>
      <a href="#" class="help-link" @click.prevent>Contact Support</a>
    </div>
  </div>
</template>

<style scoped>
.auth-form {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.close-btn {
  position: absolute;
  top: -2.5rem;
  right: 0;
  display: flex;
  color: var(--color-heading);
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
}

.section-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1.75rem 0 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-heading);
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-accent);
}

.help-note {
  margin-top: 3rem;
}

.help-label {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 0.3rem;
}

.help-link {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.75;
  text-decoration: none;
}

.help-link:hover {
  opacity: 1;
  text-decoration: underline;
}
</style>
