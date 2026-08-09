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

// Sales overview for the admin dashboard (task 3.7). Reads orders/customers
// directly via RLS (admins can see all rows) rather than a backend
// endpoint — same pattern as the rest of the admin reads in this app.
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const monthStart = startOfMonth()
  const lastMonthStart = startOfMonth(-1)
  const weekStart = daysAgo(7)

  const [ordersResult, customersResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total, payment_status, created_at')
      .gte('created_at', lastMonthStart.toISOString()),
    supabase.from('customers').select('created_at').gte('created_at', lastMonthStart.toISOString()),
  ])

  if (ordersResult.error) throw ordersResult.error
  if (customersResult.error) throw customersResult.error

  const paidOrders = (ordersResult.data ?? []).filter((o) => o.payment_status === 'paid')
  const thisMonthOrders = paidOrders.filter((o) => new Date(o.created_at) >= monthStart)
  const lastMonthOrders = paidOrders.filter(
    (o) => new Date(o.created_at) >= lastMonthStart && new Date(o.created_at) < monthStart,
  )

  const revenueThisMonth = thisMonthOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const revenueLastMonth = lastMonthOrders.reduce((sum, o) => sum + Number(o.total), 0)

  const customers = customersResult.data ?? []
  const newCustomersThisMonth = customers.filter((c) => new Date(c.created_at) >= monthStart).length
  const newCustomersThisWeek = customers.filter((c) => new Date(c.created_at) >= weekStart).length

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
