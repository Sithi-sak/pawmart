import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export type StoreApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface StoreApplication {
  id: number
  contact_name: string
  email: string
  phone: string | null
  store_name: string
  message: string | null
  status: StoreApplicationStatus
  rejection_reason: string | null
  created_at: string
}

export interface StoreApplicationInput {
  contact_name: string
  email: string
  phone?: string
  store_name: string
  message?: string
}

export interface ApproveResult {
  user_id: string
  store: { id: number; name: string; slug: string }
  email: string
  temp_password: string
}

// Public submission: no account exists yet at this point, so this is a
// plain unauthenticated insert governed by the "anyone can submit a store
// application" RLS policy (only ever a fresh pending row).
export async function submitStoreApplication(input: StoreApplicationInput): Promise<void> {
  const { error } = await supabase.from('store_applications').insert(input)
  if (error) throw error
}

// Admin-only reads/writes below go straight through Supabase via RLS, same
// pattern as the rest of the admin CRUD in this app (see 3.7 checkpoint
// notes) — only approval needs the backend (service-role auth creation).

export async function fetchStoreApplications(): Promise<StoreApplication[]> {
  const { data, error } = await supabase
    .from('store_applications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as StoreApplication[]
}

export async function rejectStoreApplication(
  id: number,
  reason: string | undefined,
  adminId: string,
): Promise<void> {
  const { error } = await supabase
    .from('store_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason ?? null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function approveStoreApplication(
  id: number,
  payload: { store_name: string; store_slug: string },
  accessToken: string,
): Promise<ApproveResult> {
  const res = await fetch(`${API_BASE}/api/store-applications/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }

  return res.json() as Promise<ApproveResult>
}

// Mirrors a simple slugify — used to prefill the editable slug field in the
// admin approval dialog from the applicant's proposed store name.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
