import { supabase } from '@/lib/supabase'

export interface Store {
  id: number
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  created_at: string
}

export interface StoreUpdateInput {
  description: string | null
  logo_url: string | null
}

// Name/slug are left out of the editable surface here: slug is the public
// storefront identity (`/store/:slug`, task 3.10.5) and shouldn't drift out
// from under it via a self-service form.
export async function fetchStoreByOwnerId(ownerId: string): Promise<Store | null> {
  const { data, error } = await supabase.from('stores').select('*').eq('owner_id', ownerId).maybeSingle()
  if (error) throw error
  return data as Store | null
}

// Public storefront lookup (task 3.10.5).
export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  const { data, error } = await supabase.from('stores').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data as Store | null
}

export async function updateStore(id: number, input: StoreUpdateInput): Promise<Store> {
  const { data, error } = await supabase.from('stores').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data as Store
}
