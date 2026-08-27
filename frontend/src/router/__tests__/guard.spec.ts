import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

function queryResult(data: unknown) {
  const result = { data, error: null }
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const authMocks = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}

const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: authMocks,
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

const { default: router } = await import('../index')

type Role = 'customer' | 'admin' | 'store_owner' | null

// Drives the same code path the app uses (auth.init() -> getSession() ->
// ensureCustomerRow()) so these tests exercise the real guard/store wiring
// rather than poking store state directly.
function mockSignedInAs(role: Role) {
  if (role === null) {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    return
  }
  const authUser = { id: `user-${role}`, email: 'a@gmail.com', user_metadata: {} }
  authMocks.getSession.mockResolvedValue({ data: { session: { user: authUser } } })
  fromMock.mockReturnValueOnce(
    queryResult({ id: authUser.id, full_name: 'Existing Name', role }),
  )
}

beforeEach(async () => {
  setActivePinia(createPinia())
  // resetAllMocks (not clearAllMocks) so a mockReturnValueOnce queued by one
  // test can never leak into the next test's fromMock calls.
  vi.resetAllMocks()
  authMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  // Several tests push the same path consecutively (e.g. two tests in a row
  // land on /store/manage); vue-router silently skips guards when the
  // resolved target equals the current location, so park on an unmatched
  // path first to guarantee every test's push is a genuinely new navigation.
  await router.push('/__test-reset__')
})

describe('router guard', () => {
  it('lets a guest reach a public route', async () => {
    mockSignedInAs(null)
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects a guest away from a requiresAuth route to login', async () => {
    mockSignedInAs(null)
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/account')
  })

  it('lets a signed-in customer reach a requiresAuth route', async () => {
    mockSignedInAs('customer')
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('account')
  })

  it('redirects a guest away from an admin route to admin-login', async () => {
    mockSignedInAs(null)
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin-login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('redirects a plain customer away from an admin route', async () => {
    mockSignedInAs('customer')
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('lets an admin reach an admin route', async () => {
    mockSignedInAs('admin')
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('redirects a guest away from a store-owner route to admin-login', async () => {
    mockSignedInAs(null)
    await router.push('/store/manage')
    expect(router.currentRoute.value.name).toBe('admin-login')
    expect(router.currentRoute.value.query.redirect).toBe('/store/manage')
  })

  it('lets a store owner reach their own management route', async () => {
    mockSignedInAs('store_owner')
    await router.push('/store/manage')
    expect(router.currentRoute.value.name).toBe('store-manage-dashboard')
  })

  it('redirects an admin away from the store-owner route (not their role)', async () => {
    mockSignedInAs('admin')
    await router.push('/store/manage')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('redirects a signed-in admin away from customer account pages to their own dashboard', async () => {
    mockSignedInAs('admin')
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('redirects a signed-in store owner away from customer account pages to their own dashboard', async () => {
    mockSignedInAs('store_owner')
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('store-manage-dashboard')
  })
})
