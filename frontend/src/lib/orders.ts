const API_BASE = import.meta.env.VITE_API_BASE_URL

export interface OrderItem {
  id: number
  product_id: number | null
  name: string
  variant: string | null
  sku: string | null
  price: number
  quantity: number
}

export type OrderStatus = 'confirmed' | 'processing' | 'shipping' | 'out_for_delivery' | 'delivered'

export interface OrderStatusHistoryEntry {
  id: number
  order_id: number
  status: OrderStatus
  created_at: string
}

export interface Order {
  id: number
  order_number: string
  customer_id: string
  status: OrderStatus
  shipping_full_name: string
  shipping_phone: string
  shipping_street: string
  shipping_city: string
  shipping_postal_code: string
  shipping_method: 'standard' | 'express'
  shipping_cost: number
  payment_method: 'visa' | 'aba_payway' | 'khqr'
  payment_status: 'paid' | 'pending_confirmation'
  subtotal: number
  discount: number
  tax: number
  total: number
  created_at: string
  items: OrderItem[]
  status_history: OrderStatusHistoryEntry[]
}

export interface OrderSummary {
  id: number
  order_number: string
  status: OrderStatus
  total: number
  created_at: string
  item_count: number
  payment_method: 'visa' | 'aba_payway' | 'khqr'
  payment_status: 'paid' | 'pending_confirmation'
  // Only present when fetched by an admin (task 3.8) — the customer's own
  // order history doesn't need it, since it's implicitly their own name.
  customer?: { id: string; full_name: string | null; email: string | null } | null
}

export interface CreateOrderPayload {
  items: { product_id: number; quantity: number }[]
  shipping: {
    full_name: string
    phone: string
    street: string
    city: string
    postal_code: string
    method: 'standard' | 'express'
  }
  payment_method: 'visa' | 'aba_payway' | 'khqr'
  voucher_code?: string | null
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

export function createOrder(payload: CreateOrderPayload, accessToken: string): Promise<Order> {
  return request<Order>('/api/orders', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchOrder(id: number, accessToken: string): Promise<Order> {
  return request<Order>(`/api/orders/${id}`, accessToken)
}

export function fetchOrders(accessToken: string): Promise<OrderSummary[]> {
  return request<OrderSummary[]>('/api/orders', accessToken)
}

export function updateOrderStatus(
  id: number,
  newStatus: OrderStatus,
  accessToken: string,
): Promise<Order> {
  return request<Order>(`/api/orders/${id}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  })
}
