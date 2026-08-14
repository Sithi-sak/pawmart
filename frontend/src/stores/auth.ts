import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Customer {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  location: string | null
  role: 'customer' | 'store_owner' | 'admin'
  loyalty_points_balance: number
}

// Email/password customer auth is Gmail-only — keeps the admin's
// non-Gmail address from ever being a valid input on the customer forms,
// without the forms needing to know admin accounts exist at all.
export function isAllowedCustomerEmail(email: string): boolean {
  return /^[^\s@]+@gmail\.com$/i.test(email.trim())
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const customer = ref<Customer | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => customer.value?.role === 'admin')
  const isStoreOwner = computed(() => customer.value?.role === 'store_owner')

  let initPromise: Promise<void> | null = null

  // Google (and any other OAuth provider) populates user_metadata with
  // different keys depending on what the provider returns and when — prefer
  // full_name/name, fall back to combining given_name + family_name.
  function deriveFullName(authUser: User): string | null {
    const metadata = authUser.user_metadata ?? {}
    const fullName = metadata.full_name as string | undefined
    const name = metadata.name as string | undefined
    const givenFamily = [metadata.given_name, metadata.family_name]
      .filter((part): part is string => !!part)
      .join(' ')
      .trim()

    return fullName || name || givenFamily || null
  }

  // customers row doesn't exist yet on first-ever sign-in (fresh signup, or
  // first Google login which skips the signup form entirely).
  async function ensureCustomerRow(authUser: User) {
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (existing) {
      customer.value = existing as Customer
      // Backfill a name that wasn't available yet on an earlier sign-in
      // (e.g. Google metadata not populated in time) once it shows up.
      if (!existing.full_name) {
        const derived = deriveFullName(authUser)
        if (derived) {
          const { data: updated } = await supabase
            .from('customers')
            .update({ full_name: derived })
            .eq('id', authUser.id)
            .select()
            .single()
          if (updated) customer.value = updated as Customer
        }
      }
      return
    }

    const { data: created, error } = await supabase
      .from('customers')
      .insert({ id: authUser.id, email: authUser.email, full_name: deriveFullName(authUser) })
      .select()
      .single()

    if (error) throw error
    customer.value = created as Customer
  }

  // supabase-js re-announces the current session (event: INITIAL_SESSION)
  // as soon as onAuthStateChange is subscribed, right after the explicit
  // getSession() call below already applied it. Without this guard that
  // redundant announcement is treated as a fresh login: customer briefly
  // goes null and back, which double-runs anything reacting to it (e.g.
  // the cart's guest-cart merge on login).
  async function applySession(next: Session | null) {
    if (next?.user && next.user.id === user.value?.id) {
      session.value = next
      user.value = next.user
      return
    }

    session.value = next
    user.value = next?.user ?? null
    customer.value = null
    if (next?.user) {
      await ensureCustomerRow(next.user)
    }
  }

  function init() {
    if (!initPromise) {
      initPromise = (async () => {
        const { data } = await supabase.auth.getSession()
        await applySession(data.session)
        supabase.auth.onAuthStateChange((_event, next) => {
          void applySession(next)
        })
        initialized.value = true
      })()
    }
    return initPromise
  }

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Separate from signInWithPassword: sets state directly instead of waiting
  // on the async onAuthStateChange listener, so the staff-role check below
  // is guaranteed to run before the caller navigates anywhere. Covers both
  // platform admins and store owners (generalized from the old admin-only
  // signInAdmin) since both sign in through the same staff login form.
  async function signInStaff(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Unable to sign in.')

    const { data: customerRow } = await supabase
      .from('customers')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (customerRow?.role !== 'admin' && customerRow?.role !== 'store_owner') {
      await supabase.auth.signOut()
      throw new Error('This account does not have staff access.')
    }

    session.value = data.session
    user.value = data.user
    customer.value = customerRow as Customer
  }

  // Returns true once the account is signed in right away, false if email
  // confirmation is required before the session becomes active.
  async function signUpWithPassword(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return !!data.session
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return {
    session,
    user,
    customer,
    initialized,
    isAuthenticated,
    isAdmin,
    isStoreOwner,
    init,
    signInWithPassword,
    signInStaff,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    sendPasswordReset,
    updatePassword,
  }
})
