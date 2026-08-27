import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, reactive } from 'vue'
import type { Reward } from '@/lib/loyalty'

const fetchRewardsMock = vi.fn()
const redeemRewardMock = vi.fn()
vi.mock('@/lib/loyalty', () => ({
  fetchRewards: (...args: unknown[]) => fetchRewardsMock(...args),
  redeemReward: (...args: unknown[]) => redeemRewardMock(...args),
}))

const fetchPetsMock = vi.fn()
const createPetMock = vi.fn()
vi.mock('@/lib/pets', () => ({
  fetchPets: (...args: unknown[]) => fetchPetsMock(...args),
  createPet: (...args: unknown[]) => createPetMock(...args),
}))

const fetchOrdersMock = vi.fn()
vi.mock('@/lib/orders', () => ({
  fetchOrders: (...args: unknown[]) => fetchOrdersMock(...args),
}))

// auth.customer needs to be a reactive object (not a plain literal, as most
// other specs use) because AccountView's pointsBalance computed reads
// auth.customer.loyalty_points_balance and handleRedeem mutates that same
// property in place on success — a plain object wouldn't register as a
// dependency, so the post-redeem balance assertions would silently see the
// stale cached value instead of the update.
let authCustomer: Record<string, unknown> | null = null
let authSession: { access_token: string } | null = null
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    customer: authCustomer,
    session: authSession,
    user: null,
    signOut: vi.fn(),
  }),
}))

const elMessageSuccessMock = vi.fn()
const elMessageErrorMock = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: {
    success: (...args: unknown[]) => elMessageSuccessMock(...args),
    error: (...args: unknown[]) => elMessageErrorMock(...args),
  },
}))

vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => h('a', slots.default?.())
    },
  }),
  useRouter: () => ({ push: vi.fn() }),
}))

const { default: AccountView } = await import('../AccountView.vue')

let nextId = 1
function makeReward(overrides: Partial<Reward> = {}): Reward {
  const id = overrides.id ?? nextId++
  return {
    id,
    title: `Reward ${id}`,
    description: 'A great reward',
    points_cost: 500,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  nextId = 1
  authCustomer = reactive({
    id: 'cust-1',
    full_name: 'Test Customer',
    email: 'test@gmail.com',
    location: '',
    loyalty_points_balance: 500,
  })
  authSession = { access_token: 'token-abc' }
  fetchPetsMock.mockResolvedValue([])
  fetchOrdersMock.mockResolvedValue([])
})

async function mountAccount(rewards: Reward[] = []) {
  fetchRewardsMock.mockResolvedValue(rewards)
  const wrapper = mount(AccountView)
  await flushPromises()
  return wrapper
}

describe('AccountView loyalty', () => {
  it('shows the current points balance', async () => {
    const wrapper = await mountAccount([])

    expect(wrapper.find('.points-value').text()).toContain('500')
  })

  it('renders each active reward with its points cost', async () => {
    const wrapper = await mountAccount([
      makeReward({ title: 'Free Shipping', points_cost: 300 }),
      makeReward({ title: '$10 Off', points_cost: 1000 }),
    ])

    const cards = wrapper.findAll('.reward-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Free Shipping')
    expect(cards[0].text()).toContain('300')
    expect(cards[1].text()).toContain('1,000')
  })

  it('disables redeem for a reward the customer cannot yet afford', async () => {
    const wrapper = await mountAccount([makeReward({ points_cost: 1000 })])

    expect(wrapper.find('.redeem-btn').attributes('disabled')).toBeDefined()
  })

  it('enables redeem for a reward the customer can afford', async () => {
    const wrapper = await mountAccount([makeReward({ points_cost: 300 })])

    expect(wrapper.find('.redeem-btn').attributes('disabled')).toBeUndefined()
  })

  it('redeems an affordable reward and updates the balance from the response', async () => {
    const reward = makeReward({ title: 'Free Shipping', points_cost: 300 })
    redeemRewardMock.mockResolvedValue({
      balance: 200,
      transaction: { id: 1, reward_id: reward.id, points: -300, type: 'redeem', created_at: 'now' },
    })
    const wrapper = await mountAccount([reward])

    await wrapper.find('.redeem-btn').trigger('click')
    await flushPromises()

    expect(redeemRewardMock).toHaveBeenCalledWith(reward.id, 'token-abc')
    expect(elMessageSuccessMock).toHaveBeenCalledWith('Redeemed "Free Shipping"')
    expect(wrapper.find('.points-value').text()).toContain('200')
  })

  it('shows an error and leaves the balance unchanged when redemption fails', async () => {
    const reward = makeReward({ title: 'Free Shipping', points_cost: 300 })
    redeemRewardMock.mockRejectedValue(new Error('Not enough points for this reward'))
    const wrapper = await mountAccount([reward])

    await wrapper.find('.redeem-btn').trigger('click')
    await flushPromises()

    expect(elMessageErrorMock).toHaveBeenCalledWith('Not enough points for this reward')
    expect(wrapper.find('.points-value').text()).toContain('500')
  })

  it('re-enables the redeem button after a failed redemption', async () => {
    const reward = makeReward({ title: 'Free Shipping', points_cost: 300 })
    redeemRewardMock.mockRejectedValue(new Error('boom'))
    const wrapper = await mountAccount([reward])

    await wrapper.find('.redeem-btn').trigger('click')
    await flushPromises()

    const btn = wrapper.find('.redeem-btn')
    expect(btn.text()).toBe('Redeem')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('does not attempt to redeem when there is no active session', async () => {
    authSession = null
    const wrapper = await mountAccount([makeReward({ points_cost: 300 })])

    await wrapper.find('.redeem-btn').trigger('click')
    await flushPromises()

    expect(redeemRewardMock).not.toHaveBeenCalled()
  })
})
