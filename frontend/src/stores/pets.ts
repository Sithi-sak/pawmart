import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchPets, type Pet } from '@/lib/pets'
import { useAuthStore } from '@/stores/auth'

export const usePetsStore = defineStore('pets', () => {
  const auth = useAuthStore()

  const pets = ref<Pet[]>([])
  const loading = ref(true)

  const hasPets = computed(() => pets.value.length > 0)
  const speciesSet = computed(() => new Set(pets.value.map((pet) => pet.species)))

  watch(
    () => auth.customer?.id,
    async (customerId, previousCustomerId) => {
      if (customerId) {
        try {
          pets.value = await fetchPets()
        } catch (err) {
          console.error('Failed to load pet profiles', err)
        } finally {
          loading.value = false
        }
      } else if (previousCustomerId) {
        pets.value = []
        loading.value = false
      } else if (auth.initialized) {
        loading.value = false
      }
    },
    { immediate: true },
  )

  watch(
    () => auth.initialized,
    (initialized) => {
      if (initialized && !auth.customer?.id) {
        loading.value = false
      }
    },
  )

  // A product is "for my pet" when its species matches one of the registered
  // pets -- species-less products (generic supplies) never match.
  function matchesPets(product: { species: string | null }): boolean {
    return !!product.species && speciesSet.value.has(product.species)
  }

  // "For Bo" reads better than "For your Cat"; fall back to the species once
  // more than two pets of that species are registered.
  function matchLabel(product: { species: string | null }): string | null {
    if (!matchesPets(product)) return null
    const names = pets.value.filter((pet) => pet.species === product.species).map((pet) => pet.name)
    if (names.length === 0) return null
    if (names.length <= 2) return `For ${names.join(' & ')}`
    return `For your ${product.species!.toLowerCase()}s`
  }

  // Pets first, then whatever order the caller already established.
  function sortPetsFirst<T extends { species: string | null }>(products: T[]): T[] {
    return products
      .map((product, index) => ({ product, index, match: matchesPets(product) ? 1 : 0 }))
      .sort((a, b) => b.match - a.match || a.index - b.index)
      .map((entry) => entry.product)
  }

  // Lets PetProfilesView keep the shared list in sync after an add/edit/delete.
  function setPets(next: Pet[]) {
    pets.value = next
  }

  return {
    pets,
    loading,
    hasPets,
    speciesSet,
    matchesPets,
    matchLabel,
    sortPetsFirst,
    setPets,
  }
})
