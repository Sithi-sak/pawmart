import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@/lib/products'

export interface WishlistItem {
  productId: number
  slug: string
  name: string
  brand: string | null
  image: string | null
  price: number
  storeName: string | null
}

interface WishlistItemRow {
  products: {
    id: number
    slug: string
    name: string
    brand: string | null
    price: number
    images: string[]
    stores: { id: number; name: string } | null
  }
}

function toWishlistItem(row: WishlistItemRow): WishlistItem {
  return {
    productId: row.products.id,
    slug: row.products.slug,
    name: row.products.name,
    brand: row.products.brand,
    image: row.products.images[0] ?? null,
    price: row.products.price,
    storeName: row.products.stores?.name ?? null,
  }
}

export const useWishlistStore = defineStore('wishlist', () => {
  const auth = useAuthStore()

  const items = ref<WishlistItem[]>([])
  const loading = ref(true)

  const itemCount = computed(() => items.value.length)

  async function load(customerId: string) {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('products(id, slug, name, brand, price, images, stores(id, name))')
      .eq('customer_id', customerId)

    if (error) throw error
    items.value = (data as unknown as WishlistItemRow[]).map(toWishlistItem)
  }

  // Same rationale as the cart's guest-merge: items saved before login
  // resolved shouldn't be discarded once we know who's signed in.
  async function mergeGuestWishlistIntoAccount(customerId: string) {
    if (!items.value.length) return

    const upserts = items.value.map((item) => ({
      customer_id: customerId,
      product_id: item.productId,
    }))

    await supabase.from('wishlist_items').upsert(upserts, { onConflict: 'customer_id,product_id' })
  }

  watch(
    () => auth.customer?.id,
    async (customerId, previousCustomerId) => {
      if (customerId) {
        // A failed merge/load (e.g. a transient network error) shouldn't
        // leave the page stuck on its loading skeleton forever.
        try {
          await mergeGuestWishlistIntoAccount(customerId)
          await load(customerId)
        } catch (err) {
          console.error('Failed to load wishlist', err)
        } finally {
          loading.value = false
        }
      } else if (previousCustomerId) {
        items.value = []
        loading.value = false
      } else if (auth.initialized) {
        loading.value = false
      }
    },
    { immediate: true },
  )

  watch(
    () => auth.initialized,
    (initialized) => {
      if (initialized && !auth.customer?.id) {
        loading.value = false
      }
    },
  )

  function has(productId: number): boolean {
    return items.value.some((item) => item.productId === productId)
  }

  async function persistAdd(productId: number) {
    const customerId = auth.customer?.id
    if (!customerId) return
    await supabase
      .from('wishlist_items')
      .upsert({ customer_id: customerId, product_id: productId }, { onConflict: 'customer_id,product_id' })
  }

  async function persistRemoval(productId: number) {
    const customerId = auth.customer?.id
    if (!customerId) return
    await supabase.from('wishlist_items').delete().eq('customer_id', customerId).eq('product_id', productId)
  }

  function add(product: Product) {
    if (has(product.id)) return
    items.value.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0] ?? null,
      price: product.price,
      storeName: product.stores?.name ?? null,
    })
    void persistAdd(product.id)
  }

  function remove(productId: number) {
    items.value = items.value.filter((item) => item.productId !== productId)
    void persistRemoval(productId)
  }

  function toggle(product: Product): boolean {
    if (has(product.id)) {
      remove(product.id)
      return false
    }
    add(product)
    return true
  }

  return {
    items,
    loading,
    itemCount,
    has,
    add,
    remove,
    toggle,
  }
})
