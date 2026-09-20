<script setup lang="ts">
import { reactive, ref } from 'vue'
import { submitStoreApplication } from '@/lib/storeApplications'

const form = reactive({
  contact_name: '',
  email: '',
  phone: '',
  store_name: '',
  message: '',
})

const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    await submitStoreApplication({
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      store_name: form.store_name.trim(),
      message: form.message.trim() || undefined,
    })
    submitted.value = true
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Unable to submit your request.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="become-seller">
    <section class="intro">
      <p class="eyebrow">Sell on PawMart</p>
      <h1 class="page-title">Become a Seller</h1>
      <p class="page-copy">
        Run a storefront on PawMart alongside our own catalogue. Tell us a bit about your business
        below. We will review every request personally and will reach out once it's been decided.
      </p>
    </section>

    <section v-if="submitted" class="confirmation">
      <h2>Thanks for applying!</h2>
      <p>
        We've received your request and will review it shortly. We'll be in touch at
        {{ form.email }}.
      </p>
    </section>

    <el-form v-else class="seller-form" label-position="top" @submit.prevent="handleSubmit">
      <div class="form-row">
        <el-form-item label="Your Name">
          <el-input v-model="form.contact_name" size="large" required />
        </el-form-item>
        <el-form-item label="Email Address">
          <el-input v-model="form.email" type="email" size="large" required />
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item label="Phone (optional)">
          <el-input v-model="form.phone" size="large" />
        </el-form-item>
        <el-form-item label="Proposed Store Name">
          <el-input v-model="form.store_name" size="large" required />
        </el-form-item>
      </div>

      <el-form-item label="Tell us about your business (optional)">
        <el-input v-model="form.message" type="textarea" :rows="4" />
      </el-form-item>

      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

      <el-button
        type="primary"
        size="large"
        class="accent-btn"
        native-type="submit"
        :loading="submitting"
      >
        Submit Request
      </el-button>
    </el-form>
  </div>
</template>

<style scoped>
.become-seller {
  max-width: 640px;
  margin: 0 auto;
  padding: 2.5rem 0 4rem;
}

.intro {
  margin-bottom: 2.5rem;
}

.eyebrow {
  color: var(--color-accent);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.page-copy {
  color: var(--color-text);
  opacity: 0.85;
}

.confirmation {
  padding: 2rem;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.confirmation h2 {
  margin-bottom: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1.5rem;
}

.field-error {
  margin: -0.5rem 0 1rem;
  font-size: 0.85rem;
  color: var(--color-accent-dark);
}

.accent-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.accent-btn:hover {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

@media (max-width: 560px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
