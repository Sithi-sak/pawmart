import { supabase } from '@/lib/supabase'

export interface ProductReview {
  id: number
  product_id: number
  customer_id: string
  reviewer_name: string
  rating: number
  comment: string | null
  created_at: string
}

export interface ReviewInput {
  product_id: number
  customer_id: string
  reviewer_name: string
  rating: number
  comment: string | null
}

export async function fetchProductReviews(productId: number): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ProductReview[]
}

// unique(product_id, customer_id) means a repeat submission hits a 23505 --
// surfaced as a friendly "already reviewed" message rather than a raw DB error.
export async function createProductReview(input: ReviewInput): Promise<ProductReview> {
  const { data, error } = await supabase.from('product_reviews').insert(input).select('*').single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already reviewed this product.')
    }
    throw error
  }
  return data as ProductReview
}

export function ratingSummary(reviews: Pick<ProductReview, 'rating'>[]): {
  average: number
  count: number
} {
  if (!reviews.length) return { average: 0, count: 0 }
  const sum = reviews.reduce((total, r) => total + r.rating, 0)
  return { average: sum / reviews.length, count: reviews.length }
}
