import { supabase } from '@/lib/supabase'

export interface Category {
  id: number
  name: string
  slug: string
}

export interface ProductStore {
  id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
}

export interface ProductOptionValue {
  id: number
  value: string
  sort_order: number
}

export interface ProductOptionGroup {
  id: number
  name: string
  sort_order: number
  product_option_values: ProductOptionValue[]
}

export interface Product {
  id: number
  category_id: number | null
  store_id: number | null
  slug: string
  name: string
  brand: string | null
  species: string | null
  price: number
  stock: number
  images: string[]
  description: string | null
  is_new: boolean
  is_promotional: boolean
  promotion_note: string | null
  is_discounted: boolean
  discount_percent: number | null
  created_at: string
  categories: Category | null
  stores: ProductStore | null
  product_option_groups?: ProductOptionGroup[]
}

const PRODUCT_COLUMNS =
  '*, categories(id, name, slug), stores(id, name, slug, description, logo_url), ' +
  'product_option_groups(id, name, sort_order, product_option_values(id, value, sort_order))'

// No per-product reorder threshold in the schema — a single shop-wide
// threshold is enough for the low-stock widget (task 3.7).
export const LOW_STOCK_THRESHOLD = 10

export function isLowStock(product: Pick<Product, 'stock'>): boolean {
  return product.stock <= LOW_STOCK_THRESHOLD
}

// Display-only sale price -- cart/checkout still charge the full listed
// price (see StoreOwnerProductsView notes); a store owner's discount tag
// isn't wired into order pricing yet.
export function effectivePrice(
  product: Pick<Product, 'price' | 'is_discounted' | 'discount_percent'>,
): number {
  if (product.is_discounted && product.discount_percent) {
    return Math.round(product.price * (1 - product.discount_percent / 100) * 100) / 100
  }
  return product.price
}

export interface ProductInput {
  category_id: number | null
  name: string
  description: string | null
  brand: string | null
  species: string | null
  price: number
  stock: number
  images: string[]
  is_promotional: boolean
  promotion_note: string | null
  is_discounted: boolean
  discount_percent: number | null
  // Required for a store owner's own CRUD (products.store_id is NOT NULL
  // and the "store owners manage own products" RLS check requires it to be
  // their own store); left unset for the admin's shop-wide product form.
  store_id?: number
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  )
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let candidate = base
  for (let suffix = 2; ; suffix++) {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error) throw error
    if (!data) return candidate
    candidate = `${base}-${suffix}`
  }
}

export async function fetchProducts(storeId?: number): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false })
  if (storeId !== undefined) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as unknown as Product[]
}

// Admin CRUD (task 3.7). Writes rely on RLS ("admins manage products")
// rather than a backend endpoint — same pattern as pet_profiles (3.4).
export async function createProduct(input: ProductInput): Promise<Product> {
  const slug = await uniqueSlug(input.name)
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, slug })
    .select(PRODUCT_COLUMNS)
    .single()

  if (error) throw error
  return data as unknown as Product
}

// Doesn't touch slug/description/is_new — the admin form doesn't manage
// those, and a slug change here would break existing links to the product.
export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select(PRODUCT_COLUMNS)
    .single()

  if (error) throw error
  return data as unknown as Product
}

export async function deleteProduct(id: number): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// Brand suggestions come from the whole catalog, not just the current
// store: a new store has no products yet, so a store-scoped list would
// always start empty. Free text either way -- brand is a plain column, not
// a table, so this only saves typing and keeps spelling consistent.
export async function fetchBrands(): Promise<string[]> {
  const { data, error } = await supabase.from('products').select('brand').not('brand', 'is', null)

  if (error) throw error
  const brands = (data as { brand: string | null }[])
    .map((row) => row.brand?.trim())
    .filter((b): b is string => !!b)
  return Array.from(new Map(brands.map((b) => [b.toLowerCase(), b])).values()).sort((a, b) =>
    a.localeCompare(b),
  )
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

export interface ProductOptionGroupInput {
  name: string
  values: string[]
}

// Rewrites a product's whole option set instead of diffing it: option rows
// are referenced by nothing else (the detail page snapshots the chosen
// values into the cart as plain text at add-to-cart time), so a delete +
// re-insert stays correct and keeps the store-owner form's save simple.
export async function saveProductOptions(
  productId: number,
  groups: ProductOptionGroupInput[],
): Promise<ProductOptionGroup[]> {
  const cleaned: ProductOptionGroupInput[] = []
  for (const group of groups) {
    const name = group.name.trim()
    const values = Array.from(
      new Map(
        group.values
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => [v.toLowerCase(), v]),
      ).values(),
    )
    // Drop half-filled rows (a named group with no values, or the reverse)
    // rather than failing the save -- the form leaves a blank row behind
    // whenever the owner adds one and changes their mind.
    if (!name || !values.length) continue
    if (cleaned.some((g) => g.name.toLowerCase() === name.toLowerCase())) continue
    cleaned.push({ name, values })
  }

  const { error: deleteError } = await supabase
    .from('product_option_groups')
    .delete()
    .eq('product_id', productId)
  if (deleteError) throw deleteError

  if (!cleaned.length) return []

  const { data: groupRows, error: groupError } = await supabase
    .from('product_option_groups')
    .insert(cleaned.map((g, i) => ({ product_id: productId, name: g.name, sort_order: i })))
    .select('id, name, sort_order')
  if (groupError) throw groupError

  // Match the inserted ids back by name rather than by position -- the
  // insert's return order isn't guaranteed. Names are unique per product
  // after the dedupe above.
  const idByName = new Map(
    (groupRows as { id: number; name: string }[]).map((row) => [row.name.toLowerCase(), row.id]),
  )

  const valueRows = cleaned.flatMap((group) =>
    group.values.map((value, i) => ({
      group_id: idByName.get(group.name.toLowerCase()) as number,
      value,
      sort_order: i,
    })),
  )

  const { data: insertedValues, error: valueError } = await supabase
    .from('product_option_values')
    .insert(valueRows)
    .select('id, group_id, value, sort_order')
  if (valueError) throw valueError

  const valuesByGroup = new Map<number, ProductOptionValue[]>()
  for (const row of insertedValues as (ProductOptionValue & { group_id: number })[]) {
    const list = valuesByGroup.get(row.group_id) ?? []
    list.push({ id: row.id, value: row.value, sort_order: row.sort_order })
    valuesByGroup.set(row.group_id, list)
  }

  return cleaned.map((group, i) => {
    const id = idByName.get(group.name.toLowerCase()) as number
    return {
      id,
      name: group.name,
      sort_order: i,
      product_option_values: (valuesByGroup.get(id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }
  })
}
