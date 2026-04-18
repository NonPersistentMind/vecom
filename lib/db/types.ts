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

// ─── Supabase schema type (used to type the client) ─────────────────────────

export interface Database {
  public: {
    Tables: {
      products:       { Row: Product;      Insert: Omit<Product, 'id' | 'created_at'>;      Update: Partial<Omit<Product, 'id' | 'created_at'>> }
      product_colors: { Row: ProductColor; Insert: Omit<ProductColor, 'id'>;                Update: Partial<Omit<ProductColor, 'id'>> }
      variants:       { Row: Variant;      Insert: Omit<Variant, 'id'>;                     Update: Partial<Omit<Variant, 'id'>> }
      product_images: { Row: ProductImage; Insert: Omit<ProductImage, 'id'>;                Update: Partial<Omit<ProductImage, 'id'>> }
      bundles:        { Row: Bundle;       Insert: Omit<Bundle, 'id' | 'created_at'>;       Update: Partial<Omit<Bundle, 'id' | 'created_at'>> }
      bundle_items:   { Row: BundleItem;   Insert: Omit<BundleItem, 'id'>;                  Update: Partial<Omit<BundleItem, 'id'>> }
      bundle_images:  { Row: BundleImage;  Insert: Omit<BundleImage, 'id'>;                 Update: Partial<Omit<BundleImage, 'id'>> }
      orders:         { Row: Order;        Insert: Omit<Order, 'id' | 'created_at'>;        Update: Partial<Omit<Order, 'id' | 'created_at'>> }
      order_items:    { Row: OrderItem;    Insert: Omit<OrderItem, 'id'>;                   Update: Partial<Omit<OrderItem, 'id'>> }
    }
  }
}
