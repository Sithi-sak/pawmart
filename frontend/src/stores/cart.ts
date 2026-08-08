import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Product } from '@/lib/products'

export interface CartItem {
  productId: number
  slug: string
  name: string
  brand: string | null
  image: string | null
  price: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const voucherCodes: Record<string, number> = {
    PAWMART10: 0.1,
    WELCOME15: 0.15,
  }

  const appliedVoucher = ref<{ code: string; rate: number } | null>(null)

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  const discount = computed(() =>
    appliedVoucher.value ? subtotal.value * appliedVoucher.value.rate : 0,
  )

  const total = computed(() => subtotal.value - discount.value)

  function addItem(product: Product, quantity = 1) {
    const existing = items.value.find((item) => item.productId === product.id)
    if (existing) {
      existing.quantity += quantity
      return
    }
    items.value.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0] ?? null,
      price: product.price,
      quantity,
    })
  }

  function applyVoucher(code: string) {
    const normalized = code.trim().toUpperCase()
    const rate = voucherCodes[normalized]
    if (rate) {
      appliedVoucher.value = { code: normalized, rate }
      return true
    }
    appliedVoucher.value = null
    return false
  }

  function removeVoucher() {
    appliedVoucher.value = null
  }

  function increment(item: CartItem) {
    item.quantity++
  }

  function decrement(item: CartItem) {
    if (item.quantity > 1) item.quantity--
  }

  function removeItem(productId: number) {
    items.value = items.value.filter((item) => item.productId !== productId)
  }

  function clear() {
    items.value = []
    appliedVoucher.value = null
  }

  return {
    items,
    appliedVoucher,
    itemCount,
    subtotal,
    discount,
    total,
    addItem,
    applyVoucher,
    removeVoucher,
    increment,
    decrement,
    removeItem,
    clear,
  }
})
