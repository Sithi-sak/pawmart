import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
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

interface CartItemRow {
  quantity: number
  products: {
    id: number
    slug: string
    name: string
    brand: string | null
    price: number
    images: string[]
  }
}

function toCartItem(row: CartItemRow): CartItem {
  return {
    productId: row.products.id,
    slug: row.products.slug,
    name: row.products.name,
    brand: row.products.brand,
    image: row.products.images[0] ?? null,
    price: row.products.price,
    quantity: row.quantity,
  }
}

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()

  const items = ref<CartItem[]>([])
  const loading = ref(true)

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

  async function load(customerId: string) {
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity, products(id, slug, name, brand, price, images)')
      .eq('customer_id', customerId)

    if (error) throw error
    items.value = (data as unknown as CartItemRow[]).map(toCartItem)
  }

  // Items added before login resolved (or while browsing as a guest)
  // shouldn't be discarded once we know who's signed in — fold them into
  // whatever's already saved for that account instead of overwriting it.
  async function mergeGuestCartIntoAccount(customerId: string) {
    if (!items.value.length) return

    const { data: existingRows } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('customer_id', customerId)

    const existingByProduct = new Map(
      (existingRows ?? []).map((row) => [row.product_id as number, row.quantity as number]),
    )

    const upserts = items.value.map((item) => ({
      customer_id: customerId,
      product_id: item.productId,
      quantity: (existingByProduct.get(item.productId) ?? 0) + item.quantity,
    }))

    await supabase.from('cart_items').upsert(upserts, { onConflict: 'customer_id,product_id' })
  }

  watch(
    () => auth.customer?.id,
    async (customerId, previousCustomerId) => {
      if (customerId) {
        await mergeGuestCartIntoAccount(customerId)
        await load(customerId)
        loading.value = false
      } else if (previousCustomerId) {
        items.value = []
        appliedVoucher.value = null
        loading.value = false
      } else if (auth.initialized) {
        // Auth has resolved and there's no customer at all (never signed
        // in) — nothing to load, so stop showing the loading state.
        loading.value = false
      }
    },
    { immediate: true },
  )

  // Covers the case where auth finishes resolving to "no session" before
  // the watcher above ever sees a truthy customerId to react to — its
  // source never changes value, so it wouldn't otherwise fire again.
  watch(
    () => auth.initialized,
    (initialized) => {
      if (initialized && !auth.customer?.id) {
        loading.value = false
      }
    },
  )

  async function persistQuantity(productId: number, quantity: number) {
    const customerId = auth.customer?.id
    if (!customerId) return
    await supabase
      .from('cart_items')
      .upsert(
        { customer_id: customerId, product_id: productId, quantity },
        { onConflict: 'customer_id,product_id' },
      )
  }

  async function persistRemoval(productId: number) {
    const customerId = auth.customer?.id
    if (!customerId) return
    await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customerId)
      .eq('product_id', productId)
  }

  function addItem(product: Product, quantity = 1) {
    const existing = items.value.find((item) => item.productId === product.id)
    const newQuantity = (existing?.quantity ?? 0) + quantity

    if (existing) {
      existing.quantity = newQuantity
    } else {
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

    void persistQuantity(product.id, newQuantity)
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
    void persistQuantity(item.productId, item.quantity)
  }

  function decrement(item: CartItem) {
    if (item.quantity > 1) {
      item.quantity--
      void persistQuantity(item.productId, item.quantity)
    }
  }

  function removeItem(productId: number) {
    items.value = items.value.filter((item) => item.productId !== productId)
    void persistRemoval(productId)
  }

  function clear() {
    const customerId = auth.customer?.id
    items.value = []
    appliedVoucher.value = null
    if (!customerId) return
    void supabase.from('cart_items').delete().eq('customer_id', customerId)
  }

  return {
    items,
    loading,
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
