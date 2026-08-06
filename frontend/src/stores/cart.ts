import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface CartItem {
  id: number
  productId: number
  name: string
  variant: string
  size: string
  price: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([
    {
      id: 1,
      productId: 3,
      name: 'Woven Leather Leash Set',
      variant: 'COGNAC / ITALIAN LEATHER',
      size: 'Medium',
      price: 210.0,
      quantity: 1,
    },
    {
      id: 2,
      productId: 5,
      name: 'Grooming Brush Kit',
      variant: 'NATURAL BOAR BRISTLE',
      size: 'Standard',
      price: 125.0,
      quantity: 2,
    },
  ])

  // Mock promo codes — real validation/discount lookup comes with the checkout API (3.2).
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

  function removeItem(id: number) {
    items.value = items.value.filter((item) => item.id !== id)
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
    applyVoucher,
    removeVoucher,
    increment,
    decrement,
    removeItem,
    clear,
  }
})
