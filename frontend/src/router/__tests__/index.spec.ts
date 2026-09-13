// 5.8 security spot-check: router/index.ts's beforeEach guard is what keeps
// a guest or a plain customer out of /admin/* and /store/manage/* in the
// UI (the backend's own require_admin/require_store_owner guards, and RLS,
// are the real enforcement for the API/DB -- see test_route_security.py
// and this checkpoint's RLS audit notes). This drives the actual router
// singleton through real navigations rather than calling the guard
// function directly, so a route that loses its requiresAdmin/
// requiresStoreOwner meta would fail these same as a broken Depends(...)
// fails test_route_security.py.
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockAuthState {
  isAuthenticated: boolean
  isAdmin: boolean
  isStoreOwner: boolean
}

const authState: MockAuthState = { isAuthenticated: false, isAdmin: false, isStoreOwner: false }

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    get isAuthenticated() {
      return authState.isAuthenticated
    },
    get isAdmin() {
      return authState.isAdmin
    },
    get isStoreOwner() {
      return authState.isStoreOwner
    },
  }),
}))

const { default: router } = await import('../index')

function setAuth(next: Partial<MockAuthState>) {
  Object.assign(authState, { isAuthenticated: false, isAdmin: false, isStoreOwner: false }, next)
}

beforeEach(async () => {
  setAuth({})
  await router.push('/')
  await router.isReady()
})

describe('admin routes (requiresAdmin)', () => {
  it('redirects a guest to admin-login', async () => {
    await router.push({ name: 'admin-dashboard' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('redirects a plain customer to admin-login, not into the admin UI', async () => {
    setAuth({ isAuthenticated: true })
    await router.push({ name: 'admin-dashboard' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('redirects a store owner to admin-login', async () => {
    setAuth({ isAuthenticated: true, isStoreOwner: true })
    await router.push({ name: 'admin-stores' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('lets an admin through', async () => {
    setAuth({ isAuthenticated: true, isAdmin: true })
    await router.push({ name: 'admin-store-requests' })
    expect(router.currentRoute.value.name).toBe('admin-store-requests')
  })
})

describe('store-manage routes (requiresStoreOwner)', () => {
  it('redirects a guest to admin-login', async () => {
    await router.push({ name: 'store-manage-orders' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('redirects a plain customer, not into the store-owner UI', async () => {
    setAuth({ isAuthenticated: true })
    await router.push({ name: 'store-manage-products' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('redirects an admin (admin has no store-owner authority, see 3.10.9)', async () => {
    setAuth({ isAuthenticated: true, isAdmin: true })
    await router.push({ name: 'store-manage-dashboard' })
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('lets a store owner through', async () => {
    setAuth({ isAuthenticated: true, isStoreOwner: true })
    await router.push({ name: 'store-manage-dashboard' })
    expect(router.currentRoute.value.name).toBe('store-manage-dashboard')
  })
})

describe('customer routes (requiresAuth)', () => {
  it('redirects a guest to login', async () => {
    await router.push({ name: 'account' })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('lets a plain customer through', async () => {
    setAuth({ isAuthenticated: true })
    await router.push({ name: 'account' })
    expect(router.currentRoute.value.name).toBe('account')
  })

  it('bounces a signed-in admin to their own dashboard instead of a customer page', async () => {
    setAuth({ isAuthenticated: true, isAdmin: true })
    await router.push({ name: 'account' })
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('bounces a signed-in store owner to their own dashboard instead of a customer page', async () => {
    setAuth({ isAuthenticated: true, isStoreOwner: true })
    await router.push({ name: 'order-history' })
    expect(router.currentRoute.value.name).toBe('store-manage-dashboard')
  })
})
