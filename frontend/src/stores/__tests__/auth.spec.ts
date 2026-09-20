import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Chainable stand-in for supabase-js's PostgrestFilterBuilder, which is
// itself thenable (resolving triggers the actual request). Every chain
// method returns the same builder; awaiting it resolves to `result`.
function queryResult(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const authMocks = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}

const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: authMocks,
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

// Imported after the mock so the store picks up the mocked client.
const { useAuthStore, isAllowedCustomerEmail } = await import('../auth')

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  authMocks.signOut.mockResolvedValue({ error: null })
})

describe('isAllowedCustomerEmail', () => {
  it('accepts a gmail.com address', () => {
    expect(isAllowedCustomerEmail('someone@gmail.com')).toBe(true)
    expect(isAllowedCustomerEmail('Someone@GMAIL.com')).toBe(true)
  })

  it('rejects non-gmail addresses', () => {
    expect(isAllowedCustomerEmail('someone@yahoo.com')).toBe(false)
    expect(isAllowedCustomerEmail('admin@pawmart.com')).toBe(false)
    expect(isAllowedCustomerEmail('not-an-email')).toBe(false)
  })
})

describe('signInWithPassword', () => {
  it('resolves on success', async () => {
    authMocks.signInWithPassword.mockResolvedValue({ error: null })
    const store = useAuthStore()

    await expect(store.signInWithPassword('a@gmail.com', 'pw')).resolves.toBeUndefined()
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@gmail.com',
      password: 'pw',
    })
  })

  it('throws the supabase error on failure', async () => {
    const error = new Error('Invalid login credentials')
    authMocks.signInWithPassword.mockResolvedValue({ error })
    const store = useAuthStore()

    await expect(store.signInWithPassword('a@gmail.com', 'wrong')).rejects.toThrow(
      'Invalid login credentials',
    )
  })
})

describe('signInWithGoogle', () => {
  it('starts the OAuth redirect to Google', async () => {
    authMocks.signInWithOAuth.mockResolvedValue({ error: null })
    const store = useAuthStore()

    await store.signInWithGoogle()

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    )
  })

  it('throws on error', async () => {
    authMocks.signInWithOAuth.mockResolvedValue({ error: new Error('popup blocked') })
    const store = useAuthStore()

    await expect(store.signInWithGoogle()).rejects.toThrow('popup blocked')
  })
})

describe('signUpWithPassword', () => {
  it('returns true when a session is issued immediately', async () => {
    authMocks.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    const store = useAuthStore()

    await expect(store.signUpWithPassword('a@gmail.com', 'pw', 'A Name')).resolves.toBe(true)
  })

  it('returns false when email confirmation is required', async () => {
    authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
    const store = useAuthStore()

    await expect(store.signUpWithPassword('a@gmail.com', 'pw', 'A Name')).resolves.toBe(false)
  })

  it('throws on signup error', async () => {
    authMocks.signUp.mockResolvedValue({ data: {}, error: new Error('Email already in use') })
    const store = useAuthStore()

    await expect(store.signUpWithPassword('a@gmail.com', 'pw', 'A Name')).rejects.toThrow(
      'Email already in use',
    )
  })
})

describe('signInStaff', () => {
  it('rejects and signs out a plain customer account', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    })
    fromMock.mockReturnValueOnce(queryResult({ role: 'customer' }))
    const store = useAuthStore()

    await expect(store.signInStaff('a@gmail.com', 'pw')).rejects.toThrow(
      'This account does not have staff access.',
    )
    expect(authMocks.signOut).toHaveBeenCalled()
    expect(store.session).toBeNull()
  })

  it('rejects and signs out a store owner whose store is banned', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u2' }, session: { access_token: 't' } },
      error: null,
    })
    fromMock
      .mockReturnValueOnce(queryResult({ id: 'u2', role: 'store_owner' })) // customers lookup
      .mockReturnValueOnce(queryResult({ status: 'banned' })) // stores lookup

    const store = useAuthStore()

    await expect(store.signInStaff('owner@example.com', 'pw')).rejects.toThrow(
      'This store has been banned. Contact PawMart support for details.',
    )
    expect(authMocks.signOut).toHaveBeenCalled()
    expect(store.session).toBeNull()
  })

  it('signs in an admin without checking for a store', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'admin-1' }, session: { access_token: 't' } },
      error: null,
    })
    fromMock.mockReturnValueOnce(queryResult({ id: 'admin-1', role: 'admin' }))

    const store = useAuthStore()
    await store.signInStaff('admin@pawmart.com', 'pw')

    expect(store.customer?.role).toBe('admin')
    expect(authMocks.signOut).not.toHaveBeenCalled()
    // Only the customers lookup should have run -- no stores query for admin.
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('signs in a store owner whose store is active', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'owner-1' }, session: { access_token: 't' } },
      error: null,
    })
    fromMock
      .mockReturnValueOnce(queryResult({ id: 'owner-1', role: 'store_owner' }))
      .mockReturnValueOnce(queryResult({ status: 'active' }))

    const store = useAuthStore()
    await store.signInStaff('owner@example.com', 'pw')

    expect(store.customer?.role).toBe('store_owner')
    expect(authMocks.signOut).not.toHaveBeenCalled()
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    const store = useAuthStore()
    await store.signOut()
    expect(authMocks.signOut).toHaveBeenCalled()
  })

  it('throws on error', async () => {
    authMocks.signOut.mockResolvedValue({ error: new Error('network error') })
    const store = useAuthStore()
    await expect(store.signOut()).rejects.toThrow('network error')
  })
})

describe('sendPasswordReset', () => {
  it('requests a reset email with the app reset-password redirect', async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null })
    const store = useAuthStore()

    await store.sendPasswordReset('a@gmail.com')

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'a@gmail.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') }),
    )
  })

  it('throws on error', async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: new Error('rate limited') })
    const store = useAuthStore()
    await expect(store.sendPasswordReset('a@gmail.com')).rejects.toThrow('rate limited')
  })
})

describe('updatePassword', () => {
  it('calls updateUser with the new password', async () => {
    authMocks.updateUser.mockResolvedValue({ error: null })
    const store = useAuthStore()

    await store.updatePassword('new-password')

    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
  })

  it('throws on error', async () => {
    authMocks.updateUser.mockResolvedValue({ error: new Error('weak password') })
    const store = useAuthStore()
    await expect(store.updatePassword('123')).rejects.toThrow('weak password')
  })
})

describe('session persistence (init)', () => {
  it('applies the existing session and creates a customer row if missing', async () => {
    const authUser = { id: 'u3', email: 'a@gmail.com', user_metadata: { full_name: 'A Name' } }
    authMocks.getSession.mockResolvedValue({ data: { session: { user: authUser } } })
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    fromMock
      .mockReturnValueOnce(queryResult(null)) // existing customer lookup -> none
      .mockReturnValueOnce(queryResult({ id: 'u3', full_name: 'A Name', role: 'customer' })) // insert

    const store = useAuthStore()
    await store.init()

    expect(store.initialized).toBe(true)
    expect(store.user?.id).toBe('u3')
    expect(store.customer?.full_name).toBe('A Name')
  })

  it('is idempotent across repeated calls', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const store = useAuthStore()
    await Promise.all([store.init(), store.init()])

    expect(authMocks.getSession).toHaveBeenCalledTimes(1)
  })

  it('does not reset customer state when the same user is re-announced', async () => {
    // Simulates supabase-js re-emitting INITIAL_SESSION for the same user
    // right after getSession() already applied it.
    const authUser = { id: 'u4', email: 'a@gmail.com', user_metadata: {} }
    authMocks.getSession.mockResolvedValue({ data: { session: { user: authUser } } })
    fromMock.mockReturnValueOnce(queryResult({ id: 'u4', full_name: 'Existing', role: 'customer' }))

    let capturedCallback: ((event: string, session: unknown) => void) | undefined
    authMocks.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const store = useAuthStore()
    await store.init()
    expect(store.customer?.full_name).toBe('Existing')

    const fromCallsAfterInit = fromMock.mock.calls.length
    capturedCallback?.('INITIAL_SESSION', { user: authUser })
    await Promise.resolve()

    // No new lookups fired, and the already-loaded customer wasn't cleared.
    expect(fromMock.mock.calls.length).toBe(fromCallsAfterInit)
    expect(store.customer?.full_name).toBe('Existing')
  })
})
