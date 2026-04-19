import 'server-only'
import { db } from './client'
import type { Order, OrderItem, OrderStatus, ShippingAddress } from './types'

export type OrderWithItems = Order & {
  order_items: OrderItem[]
}

export async function getOrders(options?: {
  status?: OrderStatus
}): Promise<Order[]> {
  let query = db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await db
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as unknown as OrderWithItems
}

export async function createOrder(input: {
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: ShippingAddress
  items: Array<{
    product_id: string
    variant_id: string
    quantity: number
    bundle_id?: string | null
  }>
}): Promise<string> {
  const { data, error } = await db.rpc('create_order', {
    p_customer_name: input.customer_name,
    p_customer_email: input.customer_email,
    p_customer_phone: input.customer_phone,
    p_shipping_address: input.shipping_address,
    p_items: input.items.map(i => ({
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity: i.quantity,
      bundle_id: i.bundle_id ?? null,
    })),
  })

  if (error) throw error
  return data as string
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  payment_ref?: string
): Promise<Order> {
  const patch: { status: OrderStatus; payment_ref?: string } = { status }
  if (payment_ref !== undefined) patch.payment_ref = payment_ref

  const { data, error } = await db
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
