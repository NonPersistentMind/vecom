import 'server-only'
import { db } from './client'
import type { Variant } from './types'

export async function getVariantsByProduct(
  productId: string,
  options?: { includeArchived?: boolean }
): Promise<Variant[]> {
  let query = db
    .from('variants')
    .select('*')
    .eq('product_id', productId)
    .order('price', { ascending: true })

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createVariant(input: {
  product_id: string
  color_id: string
  size: string
  width_cm: number
  length_cm: number
  price: number
  stock_quantity: number
  description?: string
}): Promise<Variant> {
  const { data, error } = await db
    .from('variants')
    .insert({
      product_id: input.product_id,
      color_id: input.color_id,
      size: input.size,
      width_cm: input.width_cm,
      length_cm: input.length_cm,
      price: input.price,
      stock_quantity: input.stock_quantity,
      description: input.description ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVariantStock(
  id: string,
  stock_quantity: number
): Promise<Variant> {
  const { data, error } = await db
    .from('variants')
    .update({ stock_quantity })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVariant(
  id: string,
  input: Partial<Pick<Variant, 'size' | 'width_cm' | 'length_cm' | 'price' | 'stock_quantity' | 'description' | 'color_id'>>
): Promise<Variant> {
  const { data, error } = await db
    .from('variants')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveVariant(id: string): Promise<void> {
  const { error } = await db
    .from('variants')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveVariant(id: string): Promise<void> {
  const { error } = await db
    .from('variants')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) throw error
}
