import { supabase } from '@/lib/supabase'

export interface UpcomingStore {
  id: number
  name: string
  logo_url: string | null
  description: string | null
  launch_date: string | null
  sort_order: number
  created_at: string
}

export interface UpcomingStoreInput {
  name: string
  logo_url: string | null
  description: string | null
  launch_date: string | null
  sort_order: number
}

export async function fetchUpcomingStores(): Promise<UpcomingStore[]> {
  const { data, error } = await supabase
    .from('upcoming_stores')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as UpcomingStore[]
}

export async function createUpcomingStore(input: UpcomingStoreInput): Promise<UpcomingStore> {
  const { data, error } = await supabase.from('upcoming_stores').insert(input).select('*').single()
  if (error) throw error
  return data as UpcomingStore
}

export async function updateUpcomingStore(id: number, input: UpcomingStoreInput): Promise<UpcomingStore> {
  const { data, error } = await supabase
    .from('upcoming_stores')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as UpcomingStore
}

export async function deleteUpcomingStore(id: number): Promise<void> {
  const { error } = await supabase.from('upcoming_stores').delete().eq('id', id)
  if (error) throw error
}
