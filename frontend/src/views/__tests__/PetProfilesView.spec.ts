import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import type { Pet } from '@/lib/pets'

const fetchPetsMock = vi.fn()
const createPetMock = vi.fn()
const updatePetMock = vi.fn()
const deletePetMock = vi.fn()
vi.mock('@/lib/pets', () => ({
  fetchPets: (...args: unknown[]) => fetchPetsMock(...args),
  createPet: (...args: unknown[]) => createPetMock(...args),
  updatePet: (...args: unknown[]) => updatePetMock(...args),
  deletePet: (...args: unknown[]) => deletePetMock(...args),
}))

const authInitMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    init: authInitMock,
    customer: { id: 'cust-1' },
  }),
}))

const elMessageErrorMock = vi.fn()
const elMessageBoxConfirmMock = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: { error: (...args: unknown[]) => elMessageErrorMock(...args) },
  ElMessageBox: { confirm: (...args: unknown[]) => elMessageBoxConfirmMock(...args) },
}))

vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
}))

// el-select's real popper/teleport machinery is irrelevant here -- the form
// only needs a plain modelValue-forwarding stand-in, same reasoning as
// ProductCatalogView.spec.ts.
const ElSelectStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'select',
        {
          value: props.modelValue,
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value),
        },
        slots.default?.(),
      )
  },
})
const ElOptionStub = defineComponent({
  props: ['value', 'label'],
  setup(props) {
    return () => h('option', { value: props.value }, props.label)
  },
})

const globalStubs = {
  global: { stubs: { ElSelect: ElSelectStub, ElOption: ElOptionStub } },
}

const { default: PetProfilesView } = await import('../PetProfilesView.vue')

let nextId = 1
function makePet(overrides: Partial<Pet> = {}): Pet {
  const id = overrides.id ?? nextId++
  return {
    id,
    customer_id: 'cust-1',
    name: `Pet ${id}`,
    species: 'Dog',
    breed: null,
    age: 3,
    weight: null,
    diet: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
})

async function mountPets(pets: Pet[] = []) {
  fetchPetsMock.mockResolvedValue(pets)
  const wrapper = mount(PetProfilesView, globalStubs)
  await flushPromises()
  return wrapper
}

describe('PetProfilesView', () => {
  it('renders the list of pets once loaded', async () => {
    const wrapper = await mountPets([makePet({ name: 'Luna' }), makePet({ name: 'Milo' })])

    expect(wrapper.findAll('.pet-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Luna')
    expect(wrapper.text()).toContain('Milo')
    expect(wrapper.text()).toContain('2 Companions')
  })

  it('shows an empty state with an add-companion prompt when there are no pets', async () => {
    const wrapper = await mountPets([])

    expect(wrapper.text()).toContain("You haven't added any companions yet.")
  })

  it('shows an error state when loading pets fails', async () => {
    fetchPetsMock.mockRejectedValue(new Error('network error'))

    const wrapper = mount(PetProfilesView, globalStubs)
    await flushPromises()

    expect(wrapper.text()).toContain("We couldn't load your pets.")
  })

  describe('create', () => {
    it('creates a new pet and adds it to the list', async () => {
      const created = makePet({ id: 99, name: 'Rex', species: 'Dog', age: 2 })
      createPetMock.mockResolvedValue(created)
      const wrapper = await mountPets([])

      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('#new-name').setValue('Rex')
      await wrapper.find('#new-age').setValue(2)
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(createPetMock).toHaveBeenCalledWith('cust-1', {
        name: 'Rex',
        species: 'Dog',
        breed: null,
        age: 2,
        weight: null,
        diet: null,
      })
      expect(wrapper.text()).toContain('Rex')
      expect(wrapper.find('.pet-form').exists()).toBe(false)
    })

    it('does not submit when name is blank', async () => {
      const wrapper = await mountPets([])

      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('#new-age').setValue(2)
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(createPetMock).not.toHaveBeenCalled()
    })

    it('does not submit when age is missing', async () => {
      const wrapper = await mountPets([])

      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('#new-name').setValue('Rex')
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(createPetMock).not.toHaveBeenCalled()
    })

    it('shows an error message and keeps the form open when creation fails', async () => {
      createPetMock.mockRejectedValue(new Error('boom'))
      const wrapper = await mountPets([])

      await wrapper.find('.add-btn').trigger('click')
      await wrapper.find('#new-name').setValue('Rex')
      await wrapper.find('#new-age').setValue(2)
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
      expect(wrapper.find('.pet-form').exists()).toBe(true)
    })
  })

  describe('edit', () => {
    it('updates an existing pet, including a species change', async () => {
      const pet = makePet({ id: 5, name: 'Whiskers', species: 'Dog' })
      updatePetMock.mockResolvedValue({ ...pet, species: 'Cat' })
      const wrapper = await mountPets([pet])

      await wrapper.find('.pet-action').trigger('click')
      const speciesSelect = wrapper.find('select')
      await speciesSelect.setValue('Cat')
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(updatePetMock).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ name: 'Whiskers', species: 'Cat' }),
      )
      expect(wrapper.find('.pet-form').exists()).toBe(false)
      expect(wrapper.text()).toContain('CAT')
    })

    it('does not submit when the edited name is blank', async () => {
      const pet = makePet({ name: 'Whiskers' })
      const wrapper = await mountPets([pet])

      await wrapper.find('.pet-action').trigger('click')
      await wrapper.find(`#edit-name-${pet.id}`).setValue('')
      await wrapper.find('.pet-form').trigger('submit')
      await flushPromises()

      expect(updatePetMock).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('removes the pet after confirming', async () => {
      elMessageBoxConfirmMock.mockResolvedValue(undefined)
      deletePetMock.mockResolvedValue(undefined)
      const pet = makePet({ name: 'Buddy' })
      const wrapper = await mountPets([pet])

      await wrapper.find('.pet-action.is-danger').trigger('click')
      await flushPromises()

      expect(deletePetMock).toHaveBeenCalledWith(pet.id)
      expect(wrapper.text()).not.toContain('Buddy')
    })

    it('leaves the pet in place when the confirmation is cancelled', async () => {
      elMessageBoxConfirmMock.mockRejectedValue(new Error('cancel'))
      const pet = makePet({ name: 'Buddy' })
      const wrapper = await mountPets([pet])

      await wrapper.find('.pet-action.is-danger').trigger('click')
      await flushPromises()

      expect(deletePetMock).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Buddy')
    })

    it('shows an error message and keeps the pet when deletion fails', async () => {
      elMessageBoxConfirmMock.mockResolvedValue(undefined)
      deletePetMock.mockRejectedValue(new Error('boom'))
      const pet = makePet({ name: 'Buddy' })
      const wrapper = await mountPets([pet])

      await wrapper.find('.pet-action.is-danger').trigger('click')
      await flushPromises()

      expect(elMessageErrorMock).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Buddy')
    })
  })
})
