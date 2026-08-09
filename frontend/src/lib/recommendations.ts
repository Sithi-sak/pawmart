import { supabase } from '@/lib/supabase'
import { fetchProducts, type Product } from '@/lib/products'

export interface RecommendationResult {
  products: Product[]
  // true when the list actually reflects this customer's pets/purchases,
  // false when it's the newest-arrivals fallback (guest, or nothing to go on yet).
  personalized: boolean
}

// Rule-based scoring (task 3.5 — deliberately not ML): a pet species match
// counts for more than having bought from a category before, which counts
// for more than just being a new arrival.
const SPECIES_MATCH_SCORE = 3
const CATEGORY_AFFINITY_SCORE = 2
const NEW_ARRIVAL_SCORE = 1

async function fetchPetSpecies(customerId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('pet_profiles')
    .select('species')
    .eq('customer_id', customerId)

  if (error) throw error
  return new Set((data ?? []).map((row) => row.species as string))
}

interface PurchaseHistory {
  purchasedProductIds: Set<number>
  purchasedCategoryIds: Set<number>
}

async function fetchPurchaseHistory(customerId: string): Promise<PurchaseHistory> {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, orders!inner(customer_id), products(category_id)')
    .eq('orders.customer_id', customerId)

  if (error) throw error

  const purchasedProductIds = new Set<number>()
  const purchasedCategoryIds = new Set<number>()
  for (const row of data ?? []) {
    if (row.product_id != null) purchasedProductIds.add(row.product_id)
    const categoryId = (row.products as unknown as { category_id: number | null } | null)
      ?.category_id
    if (categoryId != null) purchasedCategoryIds.add(categoryId)
  }

  return { purchasedProductIds, purchasedCategoryIds }
}

export async function fetchRecommendedProducts(
  customerId: string | null,
  opts: { excludeProductId?: number; limit?: number } = {},
): Promise<RecommendationResult> {
  const limit = opts.limit ?? 8
  const allProducts = await fetchProducts()
  const pool = allProducts.filter((p) => p.stock > 0 && p.id !== opts.excludeProductId)

  if (!customerId) {
    return { products: pool.slice(0, limit), personalized: false }
  }

  const [petSpecies, { purchasedProductIds, purchasedCategoryIds }] = await Promise.all([
    fetchPetSpecies(customerId),
    fetchPurchaseHistory(customerId),
  ])

  const scored = pool
    .filter((p) => !purchasedProductIds.has(p.id))
    .map((product) => {
      let score = 0
      if (product.species && petSpecies.has(product.species)) score += SPECIES_MATCH_SCORE
      if (product.category_id != null && purchasedCategoryIds.has(product.category_id)) {
        score += CATEGORY_AFFINITY_SCORE
      }
      if (product.is_new) score += NEW_ARRIVAL_SCORE
      return { product, score }
    })
    .sort(
      (a, b) =>
        b.score - a.score || +new Date(b.product.created_at) - +new Date(a.product.created_at),
    )

  const ranked = scored.filter((s) => s.score > 0).map((s) => s.product)
  const products = (ranked.length ? ranked : scored.map((s) => s.product)).slice(0, limit)

  return { products, personalized: ranked.length > 0 }
}
