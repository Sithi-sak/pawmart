import { supabase } from '@/lib/supabase'

export type StoreStatus = 'active' | 'banned'

export interface Store {
  id: number
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  status: StoreStatus
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

// Admin-only ban/unban (task 3.10.10) -- separate from updateStore since
// that's the store owner's own narrow self-edit surface (description/logo
// only), not something a ban action should share.
export async function setStoreStatus(id: number, status: StoreStatus): Promise<Store> {
  const { data, error } = await supabase.from('stores').update({ status }).eq('id', id).select('*').single()
  if (error) throw error
  return data as Store
}

export interface StoreWithStats extends Store {
  owner: { full_name: string; email: string } | null
  product_count: number
  order_count: number
}

// Read-only admin directory (task 3.10.9). Product/order counts are
// computed client-side from the full rows rather than a grouped count
// query -- Supabase JS has no groupBy, and this matches the "fetch then
// reduce" pattern already used for dashboard stats/low-stock elsewhere.
export async function fetchStoresForAdmin(): Promise<StoreWithStats[]> {
  const [storesResult, productsResult, ordersResult] = await Promise.all([
    supabase
      .from('stores')
      .select('*, owner:customers(full_name, email)')
      .order('created_at', { ascending: false }),
    supabase.from('products').select('store_id'),
    supabase.from('orders').select('store_id'),
  ])
  if (storesResult.error) throw storesResult.error
  if (productsResult.error) throw productsResult.error
  if (ordersResult.error) throw ordersResult.error

  const countByStore = (rows: { store_id: number | null }[]) => {
    const counts = new Map<number, number>()
    for (const row of rows) {
      if (row.store_id == null) continue
      counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1)
    }
    return counts
  }
  const productCounts = countByStore(productsResult.data ?? [])
  const orderCounts = countByStore(ordersResult.data ?? [])

  return (storesResult.data ?? []).map((s) => ({
    ...s,
    product_count: productCounts.get(s.id) ?? 0,
    order_count: orderCounts.get(s.id) ?? 0,
  })) as StoreWithStats[]
}
