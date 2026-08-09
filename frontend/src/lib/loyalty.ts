import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL

// Mirrors backend/src/backend/routers/loyalty.py's POINTS_PER_DOLLAR — used
// here only for a pre-order estimate in Checkout; the real points are
// credited server-side when the order is created.
export const POINTS_PER_DOLLAR = 5

export interface Reward {
  id: number
  title: string
  description: string | null
  points_cost: number
}

export interface RedeemResult {
  balance: number
  transaction: {
    id: number
    reward_id: number | null
    points: number
    type: 'earn' | 'redeem'
    created_at: string
  }
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('id, title, description, points_cost')
    .eq('is_active', true)
    .order('points_cost')

  if (error) throw error
  return data as Reward[]
}

export async function redeemReward(rewardId: number, accessToken: string): Promise<RedeemResult> {
  const res = await fetch(`${API_BASE}/api/loyalty/redeem/${rewardId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }

  return res.json() as Promise<RedeemResult>
}
