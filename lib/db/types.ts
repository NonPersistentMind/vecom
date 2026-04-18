// Hand-written types mirroring supabase/migrations/. Keep in sync with schema.
// Money columns (price, total_amount, price_at_purchase) are integer kopecks.

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export type DeliveryType = 'nova_poshta_branch' | 'courier'

export interface ShippingAddress {
  delivery_type: DeliveryType
  city: string
  branch?: string      // nova_poshta_branch only
  street?: string      // courier only
  building?: string    // courier only
  apartment?: string   // courier, optional
}

// ─── Row types (what the DB returns) ────────────────────────────────────────

export interface Product {
  id: string
  name: string
  description: string
  category: string
  is_archived: boolean
  created_at: string
}

export interface ProductColor {
  id: string
  product_id: string
  name: string
  hex: string
}

export interface Variant {
  id: string
  product_id: string
  color_id: string
  size: string
  width_cm: number
  length_cm: number
  price: number
  stock_quantity: number
  description: string | null
  is_archived: boolean
}

export interface ProductImage {
  id: string
  product_id: string
  color_id: string | null
  url: string
  alt: string
  position: number
}

export interface Bundle {
  id: string
  name: string
  description: string
  category: string | null
  is_archived: boolean
  discount_percent: number
  created_at: string
}

export interface BundleItem {
  id: string
  bundle_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  position: number
}

export interface BundleImage {
  id: string
  bundle_id: string
  url: string
  alt: string
  position: number
}

export interface Order {
  id: string
  status: OrderStatus
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: ShippingAddress
  payment_ref: string | null
  total_amount: number
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string
  bundle_id: string | null
  quantity: number
  price_at_purchase: number
}

