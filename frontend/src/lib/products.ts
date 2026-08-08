import { supabase } from '@/lib/supabase'

export interface Category {
  id: number
  name: string
  slug: string
}

export interface Product {
  id: number
  category_id: number | null
  slug: string
  name: string
  brand: string | null
  species: string | null
  price: number
  stock: number
  images: string[]
  description: string | null
  is_new: boolean
  created_at: string
  categories: Category | null
}

const PRODUCT_COLUMNS = '*, categories(id, name, slug)'

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as Product[]
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name')

  if (error) throw error
  return data as Category[]
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as unknown as Product | null
}

export async function fetchRelatedProducts(
  categoryId: number | null,
  excludeId: number,
  limit = 4,
): Promise<Product[]> {
  if (categoryId == null) return []

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .limit(limit)

  if (error) throw error
  return data as unknown as Product[]
}
