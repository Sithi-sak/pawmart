<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  PhCaretLeft,
  PhPlus,
  PhPencilSimple,
  PhTrash,
  PhScales,
  PhForkKnife,
} from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { fetchPets, createPet, updatePet, deletePet as deletePetRequest, type Pet } from '@/lib/pets'

const auth = useAuthStore()

const pets = reactive<Pet[]>([])
const loading = ref(true)
const loadError = ref(false)

const speciesOptions = ['Dog', 'Cat', 'Bird', 'Reptile', 'Small Pet', 'Other']

function emptyForm() {
  return {
    name: '',
    species: 'Dog',
    breed: '',
    age: null as number | null,
    weight: null as number | null,
    diet: '',
  }
}

onMounted(async () => {
  await auth.init()
  try {
    pets.push(...(await fetchPets()))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const isAddingPet = ref(false)
const newPet = reactive(emptyForm())
const saving = ref(false)

function openAddPet() {
  Object.assign(newPet, emptyForm())
  editingPetId.value = null
  isAddingPet.value = true
}

function cancelAddPet() {
  isAddingPet.value = false
}

async function saveNewPet() {
  if (!newPet.name.trim() || !newPet.age || !auth.customer) return
  saving.value = true
  try {
    const pet = await createPet(auth.customer.id, {
      name: newPet.name.trim(),
      species: newPet.species,
      breed: newPet.breed.trim() || null,
      age: newPet.age,
      weight: newPet.weight,
      diet: newPet.diet.trim() || null,
    })
    pets.push(pet)
    isAddingPet.value = false
  } catch {
    ElMessage.error('Could not save this companion. Try again.')
  } finally {
    saving.value = false
  }
}

const editingPetId = ref<number | null>(null)
const editForm = reactive(emptyForm())

function startEditPet(pet: Pet) {
  isAddingPet.value = false
  Object.assign(editForm, {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    age: pet.age,
    weight: pet.weight,
    diet: pet.diet ?? '',
  })
  editingPetId.value = pet.id
}

function cancelEditPet() {
  editingPetId.value = null
}

async function saveEditPet() {
  if (!editForm.name.trim() || !editForm.age) return
  const pet = pets.find((p) => p.id === editingPetId.value)
  if (!pet) return
  saving.value = true
  try {
    const updated = await updatePet(pet.id, {
      name: editForm.name.trim(),
      species: editForm.species,
      breed: editForm.breed.trim() || null,
      age: editForm.age,
      weight: editForm.weight,
      diet: editForm.diet.trim() || null,
    })
    Object.assign(pet, updated)
    editingPetId.value = null
  } catch {
    ElMessage.error('Could not save changes. Try again.')
  } finally {
    saving.value = false
  }
}

async function deletePet(pet: Pet) {
  try {
    await ElMessageBox.confirm(`Remove ${pet.name} from your pets?`, 'Remove Companion', {
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deletePetRequest(pet.id)
    const index = pets.findIndex((p) => p.id === pet.id)
    if (index !== -1) pets.splice(index, 1)
  } catch {
    ElMessage.error('Could not remove this companion. Try again.')
  }
}
</script>

<template>
  <div class="pet-profiles">
    <RouterLink to="/account" class="back-link">
      <PhCaretLeft :size="14" />
      Back to Account
    </RouterLink>

    <div class="page-header">
      <div>
        <h1 class="page-title">Your Pets</h1>
        <p class="page-subtitle">
          {{ pets.length }} {{ pets.length === 1 ? 'Companion' : 'Companions' }} registered
        </p>
      </div>
      <button v-if="!isAddingPet" type="button" class="add-btn" @click="openAddPet">
        <PhPlus :size="16" />
        Add Companion
      </button>
    </div>

    <div class="header-divider"></div>

    <div class="pets-grid">
      <div v-if="isAddingPet" class="pet-card is-editing">
        <h3 class="form-title">New Companion Entry</h3>
        <form class="pet-form" @submit.prevent="saveNewPet">
          <div class="form-field">
            <label for="new-name">Pet Name</label>
            <input
              id="new-name"
              v-model="newPet.name"
              type="text"
              placeholder="e.g. Luna"
              required
            />
          </div>
          <div class="form-field">
            <label for="new-species">Species</label>
            <el-select id="new-species" v-model="newPet.species" size="large" style="width: 100%">
              <el-option v-for="o in speciesOptions" :key="o" :label="o" :value="o" />
            </el-select>
          </div>
          <div class="form-field">
            <label for="new-breed">Breed</label>
            <input id="new-breed" v-model="newPet.breed" type="text" placeholder="e.g. Greyhound" />
          </div>
          <div class="form-field">
            <label for="new-age">Age (Years)</label>
            <input id="new-age" v-model.number="newPet.age" type="number" min="0" required />
          </div>
          <div class="form-field">
            <label for="new-weight">Weight (kg)</label>
            <input
              id="new-weight"
              v-model.number="newPet.weight"
              type="number"
              min="0"
              step="0.1"
            />
          </div>
          <div class="form-field">
            <label for="new-diet">Diet</label>
            <input
              id="new-diet"
              v-model="newPet.diet"
              type="text"
              placeholder="e.g. Grain-free kibble, twice daily"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-btn" @click="cancelAddPet">Cancel</button>
            <button type="submit" class="save-btn" :disabled="saving">Save Companion</button>
          </div>
        </form>
      </div>

      <div
        v-for="pet in pets"
        :key="pet.id"
        class="pet-card"
        :class="{ 'is-editing': editingPetId === pet.id }"
      >
        <template v-if="editingPetId === pet.id">
          <h3 class="form-title">Edit {{ pet.name }}</h3>
          <form class="pet-form" @submit.prevent="saveEditPet">
            <div class="form-field">
              <label :for="`edit-name-${pet.id}`">Pet Name</label>
              <input :id="`edit-name-${pet.id}`" v-model="editForm.name" type="text" required />
            </div>
            <div class="form-field">
              <label :for="`edit-species-${pet.id}`">Species</label>
              <el-select
                :id="`edit-species-${pet.id}`"
                v-model="editForm.species"
                size="large"
                style="width: 100%"
              >
                <el-option v-for="o in speciesOptions" :key="o" :label="o" :value="o" />
              </el-select>
            </div>
            <div class="form-field">
              <label :for="`edit-breed-${pet.id}`">Breed</label>
              <input :id="`edit-breed-${pet.id}`" v-model="editForm.breed" type="text" />
            </div>
            <div class="form-field">
              <label :for="`edit-age-${pet.id}`">Age (Years)</label>
              <input
                :id="`edit-age-${pet.id}`"
                v-model.number="editForm.age"
                type="number"
                min="0"
                required
              />
            </div>
            <div class="form-field">
              <label :for="`edit-weight-${pet.id}`">Weight (kg)</label>
              <input
                :id="`edit-weight-${pet.id}`"
                v-model.number="editForm.weight"
                type="number"
                min="0"
                step="0.1"
              />
            </div>
            <div class="form-field">
              <label :for="`edit-diet-${pet.id}`">Diet</label>
              <input :id="`edit-diet-${pet.id}`" v-model="editForm.diet" type="text" />
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="cancelEditPet">Cancel</button>
              <button type="submit" class="save-btn" :disabled="saving">Save Changes</button>
            </div>
          </form>
        </template>

        <template v-else>
          <div class="pet-image placeholder-img"></div>
          <div class="pet-details">
            <h3 class="pet-name">{{ pet.name }}</h3>
            <p class="pet-meta">
              {{ pet.species.toUpperCase() }}
              <template v-if="pet.breed">&bull; {{ pet.breed.toUpperCase() }}</template>
              &bull;
              {{ pet.age }}
              {{ pet.age === 1 ? 'YEAR' : 'YEARS' }}
            </p>

            <div class="pet-facts">
              <span v-if="pet.weight != null" class="pet-fact"
                ><PhScales :size="15" />{{ pet.weight }} kg</span
              >
              <span class="pet-fact"
                ><PhForkKnife :size="15" />{{ pet.diet || 'No diet notes yet' }}</span
              >
            </div>
          </div>

          <div class="pet-actions">
            <button type="button" class="pet-action" @click="startEditPet(pet)">
              <PhPencilSimple :size="14" />
              Edit
            </button>
            <button type="button" class="pet-action is-danger" @click="deletePet(pet)">
              <PhTrash :size="14" />
              Remove
            </button>
          </div>
        </template>
      </div>

      <div v-if="!loading && !loadError && !pets.length && !isAddingPet" class="empty-state">
        <p>You haven't added any companions yet.</p>
        <button type="button" class="add-btn" @click="openAddPet">
          <PhPlus :size="16" />
          Add Companion
        </button>
      </div>
    </div>

    <div v-if="loading" class="state-message">Loading your companions…</div>
    <div v-else-if="loadError" class="state-message">
      We couldn't load your pets. Try again later.
    </div>
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

.pet-profiles {
  padding: 1rem 0 4rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.7;
  text-decoration: none;
  margin-bottom: 1.5rem;
}

.back-link:hover {
  opacity: 1;
  color: var(--color-accent);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 0.4rem;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.65;
}

.add-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.9rem;
  padding: 0 1.5rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.add-btn:hover {
  background: var(--color-accent-dark);
}

.header-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 2rem;
}

.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.state-message {
  padding: 4rem 0;
  text-align: center;
  opacity: 0.7;
}

.pet-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.pet-card.is-editing {
  padding: 1.5rem;
}

.pet-image {
  aspect-ratio: 1 / 0.9;
}

.pet-details {
  padding: 1.1rem 1.25rem 1.25rem;
}

.pet-name {
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
}

.pet-meta {
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.9rem;
}

.pet-facts {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1.1rem;
}

.pet-fact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text);
}

.pet-fact svg {
  flex-shrink: 0;
  color: var(--color-accent);
}

.pet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--color-border);
}

.pet-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 2.75rem;
  background: none;
  border: none;
  border-right: 1px solid var(--color-border);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-heading);
  cursor: pointer;
}

.pet-action:last-child {
  border-right: none;
}

.pet-action:hover {
  background: var(--color-background-soft);
  color: var(--color-accent);
}

.pet-action.is-danger:hover {
  color: #c0392b;
}

/* Add / edit form */
.form-title {
  font-size: 1.25rem;
  margin-bottom: 1.1rem;
}

.pet-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.cancel-btn {
  height: 2.6rem;
  padding: 0 1.1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-accent);
}

.save-btn {
  height: 2.6rem;
  padding: 0 1.1rem;
  background: var(--color-accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

.save-btn:disabled {
  opacity: 0.75;
  cursor: default;
}

/* Empty state */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 3.5rem 1.5rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.75;
}

@media (max-width: 560px) {
  .page-header {
    flex-direction: column;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .pets-grid {
    grid-template-columns: 1fr;
  }
}
</style>
