<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import GoogleLogo from '@/components/icons/GoogleLogo.vue'
import { isAllowedCustomerEmail, useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  agreedToTerms: false,
})

const currentYear = computed(() => new Date().getFullYear())

const submitAttempted = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const confirmEmailSent = ref(false)

async function handleSubmit() {
  submitAttempted.value = true
  errorMessage.value = ''
  if (!form.agreedToTerms) return
  if (!isAllowedCustomerEmail(form.email)) {
    errorMessage.value = 'Please sign up with a Gmail address, or use Sign up with Google.'
    return
  }

  submitting.value = true
  try {
    const fullName = `${form.firstName} ${form.lastName}`.trim()
    const signedInImmediately = await auth.signUpWithPassword(form.email, form.password, fullName)
    if (signedInImmediately) {
      router.push('/account')
    } else {
      confirmEmailSent.value = true
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to create account.'
  } finally {
    submitting.value = false
  }
}

async function handleGoogleSignUp() {
  errorMessage.value = ''
  try {
    await auth.signInWithGoogle()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to sign up with Google.'
  }
}
</script>

<template>
  <div class="auth-form">
    <template v-if="confirmEmailSent">
      <h1 class="auth-title">Check Your Email</h1>
      <p class="auth-subtitle">
        We've sent a confirmation link to {{ form.email }}. Confirm your address to finish
        creating your account.
      </p>
      <p class="switch-note">
        <RouterLink to="/login">Back to Sign In</RouterLink>
      </p>
      <p class="auth-footer">&copy; {{ currentYear }} PawMart Inc.</p>
    </template>

    <template v-else>
    <h1 class="auth-title">Create Account</h1>
    <p class="auth-subtitle">
      Join PawMart for curated gear, pet-care tips, and personalized recommendations.
    </p>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="form-row">
        <div class="form-field">
          <label for="firstName">First Name</label>
          <input id="firstName" v-model="form.firstName" type="text" required />
        </div>
        <div class="form-field">
          <label for="lastName">Last Name</label>
          <input id="lastName" v-model="form.lastName" type="text" required />
        </div>
      </div>

      <div class="form-field">
        <label for="email">Email Address</label>
        <input id="email" v-model="form.email" type="email" placeholder="jlean@gmail.com" required />
      </div>

      <div class="form-field">
        <label for="password">Password</label>
        <input id="password" v-model="form.password" type="password" minlength="8" required />
      </div>

      <label class="terms-checkbox">
        <input v-model="form.agreedToTerms" type="checkbox" />
        <span class="checkbox-box"></span>
        <span>I agree to the <a href="#" @click.prevent>Privacy Policy</a> and <a href="#" @click.prevent>Terms of Service</a>.</span>
      </label>
      <p v-if="submitAttempted && !form.agreedToTerms" class="field-error">
        Please agree to the Privacy Policy and Terms of Service to continue.
      </p>
      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

      <button type="submit" class="primary-btn" :disabled="submitting">
        {{ submitting ? 'Creating Account…' : 'Create Account' }}
      </button>
    </form>

    <div class="divider"><span>OR</span></div>

    <button type="button" class="oauth-btn" @click="handleGoogleSignUp">
      <GoogleLogo :size="20" />
      Sign up with Google
    </button>

    <p class="switch-note">
      Already have an account? <RouterLink to="/login">Sign In</RouterLink>
    </p>

    <p class="auth-footer">&copy; {{ currentYear }} PawMart Inc.</p>
    </template>
  </div>
</template>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 440px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
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

.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.terms-checkbox a {
  color: var(--color-accent);
  text-decoration: none;
}

.terms-checkbox a:hover {
  text-decoration: underline;
}

.terms-checkbox input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  flex-shrink: 0;
  width: 1.2rem;
  height: 1.2rem;
  margin-top: 0.1rem;
  border: 1px solid var(--color-border);
  position: relative;
}

.terms-checkbox input:checked + .checkbox-box {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.terms-checkbox input:checked + .checkbox-box::after {
  content: '';
  position: absolute;
  left: 0.35rem;
  top: 0.12rem;
  width: 0.3rem;
  height: 0.6rem;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.field-error {
  margin-top: -1rem;
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

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  text-decoration: underline;
}

.auth-footer {
  margin-top: 3rem;
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.5;
}
</style>
