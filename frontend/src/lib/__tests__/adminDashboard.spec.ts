import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// fetchDashboardStats awaits the query chain directly (no .single()), same
// shape as cart.ts's builder in stores/__tests__/cart.spec.ts.
function queryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = Promise.resolve(result) as Promise<typeof result> & {
    select: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
  }
  builder.select = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  return builder
}

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}))

const { fetchDashboardStats } = await import('../adminDashboard')

// "Now" pinned mid-month so this-month/last-month/this-week fixture dates
// below are unambiguous regardless of when the suite actually runs.
const NOW = new Date('2026-06-15T12:00:00.000Z')
const THIS_MONTH_START = new Date('2026-06-01T00:00:00.000Z').toISOString()
const LAST_MONTH_START = new Date('2026-05-01T00:00:00.000Z').toISOString()
const TWO_DAYS_AGO = new Date('2026-06-13T00:00:00.000Z').toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchDashboardStats', () => {
  it('only counts paid orders toward revenue/orders/avg order value', async () => {
    const ordersBuilder = queryBuilder({
      data: [
        { total: 100, payment_status: 'paid', created_at: THIS_MONTH_START },
        { total: 999, payment_status: 'pending_confirmation', created_at: THIS_MONTH_START },
      ],
      error: null,
    })
    fromMock.mockReturnValueOnce(ordersBuilder).mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueThisMonth).toBe(100)
    expect(stats.ordersThisMonth).toBe(1)
    expect(stats.avgOrderValueThisMonth).toBe(100)
  })

  it('splits paid orders into this-month vs last-month buckets', async () => {
    const ordersBuilder = queryBuilder({
      data: [
        { total: 100, payment_status: 'paid', created_at: THIS_MONTH_START },
        { total: 50, payment_status: 'paid', created_at: LAST_MONTH_START },
      ],
      error: null,
    })
    fromMock.mockReturnValueOnce(ordersBuilder).mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueThisMonth).toBe(100)
    expect(stats.revenueLastMonth).toBe(50)
    expect(stats.ordersThisMonth).toBe(1)
    expect(stats.ordersLastMonth).toBe(1)
  })

  it('reports a zero avg order value when there are no paid orders this month', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.ordersThisMonth).toBe(0)
    expect(stats.avgOrderValueThisMonth).toBe(0)
  })

  it('scopes the orders query to a single store and skips the new-customers query entirely', async () => {
    const ordersBuilder = queryBuilder({
      data: [{ total: 40, payment_status: 'paid', created_at: THIS_MONTH_START }],
      error: null,
    })
    fromMock.mockReturnValueOnce(ordersBuilder)

    const stats = await fetchDashboardStats(10)

    expect(ordersBuilder.eq).toHaveBeenCalledWith('store_id', 10)
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(stats.newCustomersThisMonth).toBe(0)
    expect(stats.newCustomersThisWeek).toBe(0)
  })

  it('counts new customers this month/week only for the platform-wide (no storeId) call', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(
        queryBuilder({
          data: [
            { created_at: TWO_DAYS_AGO }, // within this week AND this month
            { created_at: THIS_MONTH_START }, // this month, not this week
            { created_at: LAST_MONTH_START }, // neither
          ],
          error: null,
        }),
      )

    const stats = await fetchDashboardStats()

    expect(stats.newCustomersThisWeek).toBe(1)
    expect(stats.newCustomersThisMonth).toBe(2)
  })
})
