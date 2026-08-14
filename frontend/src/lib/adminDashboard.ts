import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  revenueThisMonth: number
  revenueLastMonth: number
  ordersThisMonth: number
  ordersLastMonth: number
  newCustomersThisMonth: number
  newCustomersThisWeek: number
  avgOrderValueThisMonth: number
  avgOrderValueLastMonth: number
}

function startOfMonth(monthOffset = 0): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Sales overview for the admin dashboard (task 3.7), reused for a single
// store's dashboard (task 3.10.4) by passing storeId. Reads orders/customers
// directly via RLS (admins see all rows, store owners only their own store's
// orders per the 3.10.1 policies) rather than a backend endpoint — same
// pattern as the rest of the admin reads in this app.
export async function fetchDashboardStats(storeId?: number): Promise<DashboardStats> {
  const monthStart = startOfMonth()
  const lastMonthStart = startOfMonth(-1)
  const weekStart = daysAgo(7)

  let ordersQuery = supabase
    .from('orders')
    .select('total, payment_status, created_at')
    .gte('created_at', lastMonthStart.toISOString())
  if (storeId !== undefined) {
    ordersQuery = ordersQuery.eq('store_id', storeId)
  }

  const ordersResult = await ordersQuery
  if (ordersResult.error) throw ordersResult.error

  const paidOrders = (ordersResult.data ?? []).filter((o) => o.payment_status === 'paid')
  const thisMonthOrders = paidOrders.filter((o) => new Date(o.created_at) >= monthStart)
  const lastMonthOrders = paidOrders.filter(
    (o) => new Date(o.created_at) >= lastMonthStart && new Date(o.created_at) < monthStart,
  )

  const revenueThisMonth = thisMonthOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const revenueLastMonth = lastMonthOrders.reduce((sum, o) => sum + Number(o.total), 0)

  // Customers aren't scoped to a store, so "new customers" is only a
  // meaningful stat on the platform-wide admin dashboard.
  let newCustomersThisMonth = 0
  let newCustomersThisWeek = 0
  if (storeId === undefined) {
    const customersResult = await supabase
      .from('customers')
      .select('created_at')
      .gte('created_at', lastMonthStart.toISOString())
    if (customersResult.error) throw customersResult.error
    const customers = customersResult.data ?? []
    newCustomersThisMonth = customers.filter((c) => new Date(c.created_at) >= monthStart).length
    newCustomersThisWeek = customers.filter((c) => new Date(c.created_at) >= weekStart).length
  }

  return {
    revenueThisMonth,
    revenueLastMonth,
    ordersThisMonth: thisMonthOrders.length,
    ordersLastMonth: lastMonthOrders.length,
    newCustomersThisMonth,
    newCustomersThisWeek,
    avgOrderValueThisMonth: thisMonthOrders.length ? revenueThisMonth / thisMonthOrders.length : 0,
    avgOrderValueLastMonth: lastMonthOrders.length ? revenueLastMonth / lastMonthOrders.length : 0,
  }
}
