import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  revenueThisMonth: number
  revenueLastMonth: number
  ordersThisMonth: number
  ordersLastMonth: number
  newCustomersThisMonth: number
  newCustomersLastMonth: number
  avgOrderValueThisMonth: number
  avgOrderValueLastMonth: number
}

export type DeltaTrend = 'up' | 'down' | 'flat'

function startOfMonth(monthOffset = 0): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
}

// The same point in last month that we've reached in this one, so a
// month-to-date figure is never compared against a full month (which made
// every stat look like a crash on the 1st and a boom on the 31st). The day is
// clamped to last month's length, so 31 Mar compares against 28/29 Feb.
function sameMomentLastMonth(): Date {
  const now = new Date()
  const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  return new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    Math.min(now.getDate(), daysInLastMonth),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )
}

// Sales overview for the admin dashboard (task 3.7), reused for a single
// store's dashboard (task 3.10.4) by passing storeId. Reads orders/customers
// directly via RLS (admins see all rows, store owners only their own store's
// orders per the 3.10.1 policies) rather than a backend endpoint — same
// pattern as the rest of the admin reads in this app.
//
// Every "…ThisMonth" figure is month-to-date and every "…LastMonth" figure
// covers the same span of last month, so the two are directly comparable.
//
// Revenue is gross: it sums orders.subtotal, the line items at list price.
// orders.total is net of reward/voucher discounts and padded with shipping and
// tax, none of which belong in a revenue figure — shipping and tax are
// pass-throughs, and a discount reduces profit, not revenue.
export async function fetchDashboardStats(storeId?: number): Promise<DashboardStats> {
  const monthStart = startOfMonth()
  const lastMonthStart = startOfMonth(-1)
  const lastMonthPeriodEnd = sameMomentLastMonth()

  const inLastMonthPeriod = (value: string) => {
    const date = new Date(value)
    return date >= lastMonthStart && date < lastMonthPeriodEnd
  }

  let ordersQuery = supabase
    .from('orders')
    .select('subtotal, payment_status, created_at')
    .gte('created_at', lastMonthStart.toISOString())
  if (storeId !== undefined) {
    ordersQuery = ordersQuery.eq('store_id', storeId)
  }

  const ordersResult = await ordersQuery
  if (ordersResult.error) throw ordersResult.error

  const paidOrders = (ordersResult.data ?? []).filter((o) => o.payment_status === 'paid')
  const thisMonthOrders = paidOrders.filter((o) => new Date(o.created_at) >= monthStart)
  const lastMonthOrders = paidOrders.filter((o) => inLastMonthPeriod(o.created_at))

  const revenueThisMonth = thisMonthOrders.reduce((sum, o) => sum + Number(o.subtotal), 0)
  const revenueLastMonth = lastMonthOrders.reduce((sum, o) => sum + Number(o.subtotal), 0)

  // Customers aren't scoped to a store, so "new customers" is only a
  // meaningful stat on the platform-wide admin dashboard.
  let newCustomersThisMonth = 0
  let newCustomersLastMonth = 0
  if (storeId === undefined) {
    const customersResult = await supabase
      .from('customers')
      .select('created_at')
      .gte('created_at', lastMonthStart.toISOString())
    if (customersResult.error) throw customersResult.error
    const customers = customersResult.data ?? []
    newCustomersThisMonth = customers.filter((c) => new Date(c.created_at) >= monthStart).length
    newCustomersLastMonth = customers.filter((c) => inLastMonthPeriod(c.created_at)).length
  }

  return {
    revenueThisMonth,
    revenueLastMonth,
    ordersThisMonth: thisMonthOrders.length,
    ordersLastMonth: lastMonthOrders.length,
    newCustomersThisMonth,
    newCustomersLastMonth,
    avgOrderValueThisMonth: thisMonthOrders.length ? revenueThisMonth / thisMonthOrders.length : 0,
    avgOrderValueLastMonth: lastMonthOrders.length ? revenueLastMonth / lastMonthOrders.length : 0,
  }
}

// Shared by the admin and store-owner dashboards so both cards read the same.
// "flat" exists so a stat that genuinely didn't move isn't painted green.
export function formatDelta(
  current: number,
  previous: number,
): { text: string; trend: DeltaTrend } {
  if (previous === 0) {
    return current > 0
      ? { text: 'New this period', trend: 'up' }
      : { text: 'No change vs last month', trend: 'flat' }
  }
  const pct = ((current - previous) / previous) * 100
  if (pct === 0) return { text: 'No change vs last month', trend: 'flat' }
  const sign = pct > 0 ? '+' : ''
  return {
    text: `${sign}${pct.toFixed(1)}% vs same period last month`,
    trend: pct > 0 ? 'up' : 'down',
  }
}
