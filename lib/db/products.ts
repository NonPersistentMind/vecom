import 'server-only'
import { db } from './client'
import type { Product, ProductColor, Variant, ProductImage } from './types'

export type ProductWithDetails = Product & {
  product_colors: ProductColor[]
  variants: Variant[]
  product_images: ProductImage[]
}

export async function getProducts(options?: {
  category?: string
  includeArchived?: boolean
}): Promise<Product[]> {
  let query = db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getProductById(id: string): Promise<ProductWithDetails | null> {
  const { data, error } = await db
    .from('products')
    .select('*, product_colors(*), variants(*), product_images(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as ProductWithDetails
}

export async function createProduct(input: {
  name: string
  description?: string
  category: string
}): Promise<Product> {
  const { data, error } = await db
    .from('products')
    .insert({
      name: input.name,
      description: input.description ?? '',
      category: input.category,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(
  id: string,
  input: Partial<Pick<Product, 'name' | 'description' | 'category'>>
): Promise<Product> {
  const { data, error } = await db
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveProduct(id: string): Promise<void> {
  const { error } = await db
    .from('products')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveProduct(id: string): Promise<void> {
  const { error } = await db
    .from('products')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) throw error
}
