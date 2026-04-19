import 'server-only'
import { db } from './client'
import type { Bundle, BundleItem, BundleImage } from './types'

export type BundleWithDetails = Bundle & {
  bundle_items: BundleItem[]
  bundle_images: BundleImage[]
}

export async function getBundles(options?: {
  category?: string
  includeArchived?: boolean
}): Promise<Bundle[]> {
  let query = db
    .from('bundles')
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

export async function getBundleById(id: string): Promise<BundleWithDetails | null> {
  const { data, error } = await db
    .from('bundles')
    .select('*, bundle_items(*), bundle_images(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as BundleWithDetails
}

export async function createBundle(input: {
  name: string
  description?: string
  category?: string | null
  discount_percent: number
}): Promise<Bundle> {
  const { data, error } = await db
    .from('bundles')
    .insert({
      name: input.name,
      description: input.description ?? '',
      category: input.category ?? null,
      discount_percent: input.discount_percent,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBundle(
  id: string,
  input: Partial<Pick<Bundle, 'name' | 'description' | 'category' | 'discount_percent'>>
): Promise<Bundle> {
  const { data, error } = await db
    .from('bundles')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveBundle(id: string): Promise<void> {
  const { error } = await db
    .from('bundles')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) throw error
}

export async function unarchiveBundle(id: string): Promise<void> {
  const { error } = await db
    .from('bundles')
    .update({ is_archived: false })
    .eq('id', id)

  if (error) throw error
}

export async function addBundleItem(input: {
  bundle_id: string
  product_id: string
  variant_id?: string | null
  quantity?: number
  position?: number
}): Promise<BundleItem> {
  const { data, error } = await db
    .from('bundle_items')
    .insert({
      bundle_id: input.bundle_id,
      product_id: input.product_id,
      variant_id: input.variant_id ?? null,
      quantity: input.quantity ?? 1,
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeBundleItem(id: string): Promise<void> {
  const { error } = await db
    .from('bundle_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}
