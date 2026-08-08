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

export interface Order {
  id: number
  order_number: string
  customer_id: string
  status: string
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
