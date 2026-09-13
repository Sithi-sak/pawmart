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
  discount_amount: number | null
  free_shipping: boolean
}

// An unconsumed "redeem" ledger row — a reward the customer already paid
// points for (via redeemReward) and hasn't applied to an order yet.
export interface AvailableRedemption {
  id: number
  reward: Pick<Reward, 'id' | 'title' | 'discount_amount' | 'free_shipping'>
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
    .select('id, title, description, points_cost, discount_amount, free_shipping')
    .eq('is_active', true)
    .order('points_cost')

  if (error) throw error
  return data as Reward[]
}

// RLS ("customers view own loyalty transactions") scopes this to the
// signed-in customer's own rows, same pattern as fetchRewards' public read.
export async function fetchAvailableRedemptions(): Promise<AvailableRedemption[]> {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('id, loyalty_rewards(id, title, discount_amount, free_shipping)')
    .eq('type', 'redeem')
    .is('order_id', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as { id: number; loyalty_rewards: AvailableRedemption['reward'] }[]).map(
    (row) => ({ id: row.id, reward: row.loyalty_rewards }),
  )
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
