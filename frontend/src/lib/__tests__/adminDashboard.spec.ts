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

const { fetchDashboardStats, formatDelta } = await import('../adminDashboard')

// "Now" pinned mid-month so this-month/last-month/this-week fixture dates
// below are unambiguous regardless of when the suite actually runs.
const NOW = new Date('2026-06-15T12:00:00.000Z')
const THIS_MONTH_START = new Date('2026-06-01T00:00:00.000Z').toISOString()
const LAST_MONTH_START = new Date('2026-05-01T00:00:00.000Z').toISOString()
const LAST_MONTH_SAME_PERIOD = new Date('2026-05-10T00:00:00.000Z').toISOString()
// Past the 15th, so it falls in last month but outside the elapsed-so-far
// window this month is compared against.
const LAST_MONTH_AFTER_PERIOD = new Date('2026-05-28T00:00:00.000Z').toISOString()

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
        { subtotal: 100, payment_status: 'paid', created_at: THIS_MONTH_START },
        { subtotal: 999, payment_status: 'pending_confirmation', created_at: THIS_MONTH_START },
      ],
      error: null,
    })
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueThisMonth).toBe(100)
    expect(stats.ordersThisMonth).toBe(1)
    expect(stats.avgOrderValueThisMonth).toBe(100)
  })

  it('splits paid orders into this-month vs last-month buckets', async () => {
    const ordersBuilder = queryBuilder({
      data: [
        { subtotal: 100, payment_status: 'paid', created_at: THIS_MONTH_START },
        { subtotal: 50, payment_status: 'paid', created_at: LAST_MONTH_START },
      ],
      error: null,
    })
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueThisMonth).toBe(100)
    expect(stats.revenueLastMonth).toBe(50)
    expect(stats.ordersThisMonth).toBe(1)
    expect(stats.ordersLastMonth).toBe(1)
  })

  it('counts revenue gross, before discounts and vouchers', async () => {
    // subtotal is the line-item sum at list price; orders.total would be this
    // net of the reward discount and padded with shipping + tax.
    const ordersBuilder = queryBuilder({
      data: [
        {
          subtotal: 200,
          discount: 50,
          shipping_cost: 5,
          tax: 15,
          total: 170,
          payment_status: 'paid',
          created_at: THIS_MONTH_START,
        },
      ],
      error: null,
    })
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(ordersBuilder.select).toHaveBeenCalledWith('subtotal, payment_status, created_at')
    expect(stats.revenueThisMonth).toBe(200)
    expect(stats.avgOrderValueThisMonth).toBe(200)
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
      data: [{ subtotal: 40, payment_status: 'paid', created_at: THIS_MONTH_START }],
      error: null,
    })
    fromMock.mockReturnValueOnce(ordersBuilder)

    const stats = await fetchDashboardStats(10)

    expect(ordersBuilder.eq).toHaveBeenCalledWith('store_id', 10)
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(stats.newCustomersThisMonth).toBe(0)
    expect(stats.newCustomersLastMonth).toBe(0)
  })

  it('counts new customers per period only for the platform-wide (no storeId) call', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: [], error: null })).mockReturnValueOnce(
      queryBuilder({
        data: [
          { created_at: THIS_MONTH_START },
          { created_at: LAST_MONTH_SAME_PERIOD },
          { created_at: LAST_MONTH_AFTER_PERIOD }, // last month, but past the 15th
        ],
        error: null,
      }),
    )

    const stats = await fetchDashboardStats()

    expect(stats.newCustomersThisMonth).toBe(1)
    expect(stats.newCustomersLastMonth).toBe(1)
  })

  it('compares against the same elapsed span of last month, not the whole month', async () => {
    const ordersBuilder = queryBuilder({
      data: [
        { subtotal: 100, payment_status: 'paid', created_at: THIS_MONTH_START },
        { subtotal: 50, payment_status: 'paid', created_at: LAST_MONTH_SAME_PERIOD },
        { subtotal: 999, payment_status: 'paid', created_at: LAST_MONTH_AFTER_PERIOD },
      ],
      error: null,
    })
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueLastMonth).toBe(50)
    expect(stats.ordersLastMonth).toBe(1)
  })

  it('clamps the comparison day to the length of a shorter previous month', async () => {
    vi.setSystemTime(new Date('2026-03-31T12:00:00.000Z'))
    const ordersBuilder = queryBuilder({
      data: [
        { subtotal: 100, payment_status: 'paid', created_at: '2026-03-02T00:00:00.000Z' },
        { subtotal: 50, payment_status: 'paid', created_at: '2026-02-27T00:00:00.000Z' },
      ],
      error: null,
    })
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const stats = await fetchDashboardStats()

    expect(stats.revenueThisMonth).toBe(100)
    expect(stats.revenueLastMonth).toBe(50)
  })
})

describe('formatDelta', () => {
  it('reports a percentage against the same period last month', () => {
    expect(formatDelta(150, 100)).toEqual({
      text: '+50.0% vs same period last month',
      trend: 'up',
    })
    expect(formatDelta(50, 100)).toEqual({
      text: '-50.0% vs same period last month',
      trend: 'down',
    })
  })

  it('stays neutral rather than green when nothing moved', () => {
    expect(formatDelta(0, 0)).toEqual({ text: 'No change vs last month', trend: 'flat' })
    expect(formatDelta(100, 100)).toEqual({ text: 'No change vs last month', trend: 'flat' })
  })

  it('labels a period with no prior baseline as new', () => {
    expect(formatDelta(10, 0)).toEqual({ text: 'New this period', trend: 'up' })
  })
})
