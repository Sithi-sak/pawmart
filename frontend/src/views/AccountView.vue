<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  PhEnvelopeSimple,
  PhMapPin,
  PhCaretRight,
  PhPlus,
  PhClockCounterClockwise,
  PhUserPlus,
  PhCalendarCheck,
  PhShoppingBag,
} from '@phosphor-icons/vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fetchPets, createPet, type Pet } from '@/lib/pets'

const auth = useAuthStore()
const router = useRouter()

interface Profile {
  name: string
  email: string
  location: string
}

const profile = reactive<Profile>({
  name: '',
  email: '',
  location: '',
})

const isEditing = ref(false)

// auth.customer can populate asynchronously after this component has
// already mounted (e.g. right after an OAuth redirect) — snapshotting it
// once at setup time meant the name sometimes rendered blank. Keep it live
// instead, except while the user has unsaved edits open.
watch(
  () => auth.customer,
  (customer) => {
    if (isEditing.value) return
    profile.name = customer?.full_name ?? ''
    profile.email = customer?.email ?? auth.user?.email ?? ''
    profile.location = customer?.location ?? ''
  },
  { immediate: true },
)

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
}

const editForm = reactive<Profile>({ ...profile })

function startEdit() {
  Object.assign(editForm, profile)
  isEditing.value = true
}

function saveEdit() {
  Object.assign(profile, editForm)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

const pets = reactive<Pet[]>([])
const petsLoading = ref(true)

onMounted(async () => {
  try {
    pets.push(...(await fetchPets()))
  } finally {
    petsLoading.value = false
  }
})

interface RecentOrder {
  id: number
  name: string
  status: string
  date: string
  price: number
}

const recentOrders: RecentOrder[] = [
  { id: 1, name: 'The Signature Collar', status: 'Delivered', date: 'Oct 12', price: 245 },
  { id: 2, name: 'Matte Ceramic Bowl', status: 'Shipped', date: 'Oct 08', price: 85 },
  { id: 3, name: 'Cashmere Pet Throw', status: 'Delivered', date: 'Sep 24', price: 420 },
]

interface Reward {
  id: number
  title: string
  description: string
}

const rewards: Reward[] = [
  { id: 1, title: '15% Off', description: 'Lorem ipsum dolor sit amet' },
  { id: 2, title: 'Complimentary', description: 'Lorem ipsum dolor sit amet' },
  { id: 3, title: '$50 Credit', description: 'Lorem ipsum dolor sit amet' },
]

const pointsBalance = 14250
const pointsTarget = 15000
const pointsRemaining = computed(() => pointsTarget - pointsBalance)
const pointsProgress = computed(() => (pointsBalance / pointsTarget) * 100)

function formatPoints(value: number) {
  return value.toLocaleString('en-US')
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

const speciesOptions = ['Dog', 'Cat', 'Bird', 'Reptile', 'Small Pet', 'Other']

const isAddingPet = ref(false)

const newPet = reactive({
  name: '',
  species: 'Dog',
  breed: '',
  age: null as number | null,
})

function openAddPet() {
  Object.assign(newPet, { name: '', species: 'Dog', breed: '', age: null })
  isAddingPet.value = true
}

async function saveCompanion() {
  if (!newPet.name.trim() || !newPet.age || !auth.customer) return
  try {
    const pet = await createPet(auth.customer.id, {
      name: newPet.name.trim(),
      species: newPet.species,
      breed: newPet.breed.trim() || null,
      age: newPet.age,
      weight: null,
      diet: null,
    })
    pets.push(pet)
    isAddingPet.value = false
  } catch {
    ElMessage.error('Could not save this companion. Try again.')
  }
}
</script>

<template>
  <div class="account">
    <div class="profile-header">
      <div v-if="!isEditing" class="profile-info">
        <h1 class="profile-name">{{ profile.name }}</h1>
        <div class="profile-meta">
          <span class="meta-item"><PhEnvelopeSimple :size="16" />{{ profile.email }}</span>
          <span class="meta-item"><PhMapPin :size="16" />{{ profile.location }}</span>
        </div>
      </div>
      <div v-else class="profile-edit-form">
        <div class="form-field">
          <label for="profile-name">Name</label>
          <input id="profile-name" v-model="editForm.name" type="text" />
        </div>
        <div class="form-field">
          <label for="profile-email">Email</label>
          <input id="profile-email" v-model="editForm.email" type="email" />
        </div>
        <div class="form-field">
          <label for="profile-location">Location</label>
          <input id="profile-location" v-model="editForm.location" type="text" />
        </div>
      </div>

      <div class="profile-actions">
        <template v-if="!isEditing">
          <button type="button" class="cancel-btn" @click="handleSignOut">Sign Out</button>
          <button type="button" class="edit-btn" @click="startEdit">Edit Profile</button>
        </template>
        <template v-else>
          <button type="button" class="cancel-btn" @click="cancelEdit">Cancel</button>
          <button type="button" class="edit-btn" @click="saveEdit">Save</button>
        </template>
      </div>
    </div>

    <div class="header-divider"></div>

    <div class="profile-body">
      <section class="pets-section">
        <div class="section-header">
          <h2 class="section-title">Your Pets</h2>
          <RouterLink to="/account/pets" class="manage-link">
            Manage All
            <PhCaretRight :size="14" />
          </RouterLink>
        </div>

        <p v-if="petsLoading" class="pets-loading">Loading your pets…</p>

        <div v-else class="pets-grid">
          <RouterLink v-for="pet in pets" :key="pet.id" to="/account/pets" class="pet-card">
            <div class="pet-image placeholder-img">
              <span class="status-badge">Active</span>
            </div>
            <div class="pet-details">
              <h3 class="pet-name">{{ pet.name }}</h3>
              <p class="pet-meta">
                <template v-if="pet.breed">{{ pet.breed.toUpperCase() }} &bull; </template
                >{{ pet.age }} YEARS
              </p>
            </div>
          </RouterLink>
        </div>

        <button v-if="!isAddingPet" type="button" class="add-companion-box" @click="openAddPet">
          <span class="add-icon"><PhPlus :size="20" /></span>
          <span class="add-title">Add Companion</span>
          <span class="add-subtitle">Register a new pet to your profile</span>
        </button>

        <div v-else class="add-companion-form">
          <h3 class="add-form-title">New Companion Entry</h3>
          <form class="pet-form" @submit.prevent="saveCompanion">
            <div class="form-row">
              <div class="form-field">
                <label for="pet-name">Pet Name</label>
                <input
                  id="pet-name"
                  v-model="newPet.name"
                  type="text"
                  placeholder="e.g. Luna"
                  required
                />
              </div>
              <div class="form-field">
                <label for="pet-species">Species</label>
                <el-select
                  id="pet-species"
                  v-model="newPet.species"
                  size="large"
                  style="width: 100%"
                >
                  <el-option
                    v-for="option in speciesOptions"
                    :key="option"
                    :label="option"
                    :value="option"
                  />
                </el-select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pet-breed">Breed</label>
                <input
                  id="pet-breed"
                  v-model="newPet.breed"
                  type="text"
                  placeholder="e.g. Greyhound"
                />
              </div>
              <div class="form-field">
                <label for="pet-age">Age</label>
                <input
                  id="pet-age"
                  v-model.number="newPet.age"
                  type="number"
                  min="0"
                  placeholder="Years"
                  required
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="isAddingPet = false">Cancel</button>
              <button type="submit" class="save-btn">Save Companion</button>
            </div>
          </form>
        </div>
      </section>

      <aside class="orders-sidebar">
        <div class="sidebar-header">
          <h2 class="card-title">Recent Orders</h2>
          <PhClockCounterClockwise :size="20" />
        </div>
        <div class="card-divider"></div>

        <div class="order-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-row">
            <div class="order-thumb placeholder-img"></div>
            <div class="order-info">
              <p class="order-name">{{ order.name }}</p>
              <p class="order-status">
                {{ order.status.toUpperCase() }} &bull; {{ order.date.toUpperCase() }}
              </p>
            </div>
            <p class="order-price">{{ formatPrice(order.price) }}</p>
          </div>
        </div>

        <RouterLink to="/account/orders" class="history-btn">View Full History</RouterLink>
      </aside>
    </div>

    <div class="section-divider"></div>

    <section class="loyalty-section">
      <div class="loyalty-header">
        <div>
          <p class="eyebrow">Loyalty Program</p>
          <h2 class="loyalty-title">Paws Rewards</h2>
        </div>
        <div class="tier-info">
          <p class="tier-label">Current Tier</p>
          <p class="tier-value">Platinum Member</p>
        </div>
      </div>

      <div class="loyalty-body">
        <div class="points-card">
          <p class="points-label">Points Balance</p>
          <p class="points-value">
            {{ formatPoints(pointsBalance) }}<span class="points-unit">Points</span>
          </p>
          <p class="points-note">
            You are {{ formatPoints(pointsRemaining) }} points away from your next Paws reward.
          </p>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${pointsProgress}%` }"></div>
          </div>
          <div class="progress-labels">
            <span>{{ formatPoints(pointsBalance) }}</span>
            <span>{{ formatPoints(pointsTarget) }}</span>
          </div>
        </div>

        <div class="rewards-section">
          <p class="rewards-label">Available Rewards</p>
          <div class="rewards-grid">
            <div v-for="reward in rewards" :key="reward.id" class="reward-card">
              <h3 class="reward-title">{{ reward.title }}</h3>
              <p class="reward-description">{{ reward.description }}</p>
              <button type="button" class="redeem-btn">Redeem</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-divider"></div>

      <div class="earn-points">
        <p class="earn-heading">How to Earn Points</p>
        <div class="earn-grid">
          <div class="earn-item">
            <PhUserPlus :size="22" />
            <div>
              <p class="earn-title">Refer a Companion</p>
              <p class="earn-subtitle">500 Points Per Referral</p>
            </div>
          </div>
          <div class="earn-item">
            <PhCalendarCheck :size="22" />
            <div>
              <p class="earn-title">Annual Renewal</p>
              <p class="earn-subtitle">1,000 Points Anniversary Bonus</p>
            </div>
          </div>
          <div class="earn-item">
            <PhShoppingBag :size="22" />
            <div>
              <p class="earn-title">Purchase Accessories</p>
              <p class="earn-subtitle">5 Points Per $1 Spent</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

@media (prefers-color-scheme: dark) {
  .placeholder-img {
    background: linear-gradient(180deg, #4a4a4a 0%, #2c2c2c 100%);
  }
}

.account {
  padding: 1rem 0 4rem;
}

/* Header */
.profile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.profile-name {
  font-size: 2.75rem;
  margin-bottom: 0.5rem;
}

.profile-meta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.75;
}

.profile-edit-form {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  max-width: 640px;
}

.profile-edit-form .form-field {
  flex: 1;
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

.profile-actions {
  flex-shrink: 0;
  display: flex;
  gap: 0.75rem;
}

.edit-btn {
  height: 2.9rem;
  padding: 0 1.5rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.edit-btn:hover {
  background: var(--color-accent-dark);
}

.cancel-btn {
  height: 2.9rem;
  padding: 0 1.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-accent);
}

.header-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 2.5rem;
}

/* Body */
.profile-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2.5rem;
  align-items: start;
  margin-bottom: 3rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.85rem;
}

.manage-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.manage-link:hover {
  color: var(--color-accent-dark);
}

.pets-loading {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 1.5rem;
}

.pets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.pet-card {
  display: block;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;
}

.pet-card:hover {
  border-color: var(--color-accent);
}

.pet-image {
  position: relative;
  aspect-ratio: 4 / 3;
}

.status-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  padding: 0.3rem 0.65rem;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
}

.pet-details {
  padding: 1.1rem 1.25rem 1.25rem;
}

.pet-name {
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
}

.pet-meta {
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.6;
}

.add-companion-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 2.5rem 1.5rem;
  background: none;
  border: 1px dashed var(--color-accent);
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
}

.add-companion-box:hover {
  background: var(--color-background-soft);
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  background: var(--color-background-soft);
  color: var(--color-text);
}

.add-title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  color: var(--color-heading);
}

.add-subtitle {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
}

.add-companion-form {
  width: 100%;
  padding: 1.75rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.add-form-title {
  font-size: 1.3rem;
  margin-bottom: 1.25rem;
}

/* Sidebar */
.orders-sidebar {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 1.75rem;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text);
}

.card-title {
  font-size: 1.3rem;
}

.card-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1rem 0 1.25rem;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-bottom: 1.5rem;
}

.order-row {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--color-border);
}

.order-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.order-thumb {
  aspect-ratio: 1 / 1;
}

.order-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.order-status {
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  opacity: 0.6;
}

.order-price {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 2.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.history-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.section-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 2.5rem;
}

/* Loyalty */
.loyalty-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.4rem;
}

.loyalty-title {
  font-size: 2.25rem;
}

.tier-info {
  text-align: right;
}

.tier-label {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.3rem;
}

.tier-value {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  color: var(--color-accent);
}

.loyalty-body {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.points-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 1.75rem;
}

.points-label {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 0.75rem;
}

.points-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-family: var(--font-serif);
  font-size: 2.75rem;
  color: var(--color-accent);
  margin-bottom: 0.75rem;
}

.points-unit {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
}

.points-note {
  font-size: 0.85rem;
  color: var(--color-text);
  margin-bottom: 1.25rem;
}

.progress-track {
  height: 0.5rem;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.6rem;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.rewards-label {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 0.9rem;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.reward-card {
  border: 1px solid var(--color-border);
  padding: 1.5rem;
}

.reward-title {
  font-size: 1.2rem;
  margin-bottom: 0.4rem;
}

.reward-description {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 1.25rem;
}

.redeem-btn {
  display: block;
  width: 100%;
  height: 2.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  cursor: pointer;
}

.redeem-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.earn-heading {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 1.1rem;
}

.earn-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.earn-item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  color: var(--color-accent);
}

.earn-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 0.2rem;
}

.earn-subtitle {
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.6;
}

/* Add companion form */
.pet-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.save-btn {
  height: 2.9rem;
  padding: 0 1.75rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--color-accent-dark);
}

@media (max-width: 900px) {
  .profile-header {
    flex-direction: column;
  }

  .profile-edit-form {
    flex-direction: column;
    max-width: none;
    width: 100%;
  }

  .profile-body {
    grid-template-columns: 1fr;
  }

  .pets-grid {
    grid-template-columns: 1fr;
  }

  .loyalty-header {
    flex-direction: column;
    gap: 1rem;
  }

  .tier-info {
    text-align: left;
  }

  .loyalty-body {
    grid-template-columns: 1fr;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }

  .earn-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
