# Data Model

Source of truth: [`supabase/migrations/`](../supabase/migrations/), applied to the hosted Supabase Postgres instance.

This document grows as migrations are added. Per-milestone status is shown next to each table heading.

## Money

All monetary amounts are stored as **integer kopecks** (копійки — 1 UAH = 100 копійок).

- Avoids floating-point rounding bugs entirely.
- Monetary columns use the natural name (`price`, `total`, etc.) with a Postgres `COMMENT ON COLUMN` annotation stating the unit. The data-model doc and the column comment carry the unit — we do not suffix column names.
- Display code divides by 100 when rendering UAH.

## Identifiers

- All primary keys are `uuid`, server-generated via `gen_random_uuid()` (requires `pgcrypto`).
- Timestamps use `timestamptz` — never naive `timestamp`.

## Tables

### `products` *(M0.2.A)*

Catalog entry. Size-specific price and stock live on variants, not here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `name` | `text` NOT NULL | Ukrainian display name |
| `description` | `text` NOT NULL, default `''` | Ukrainian long-form copy |
| `category` | `text` NOT NULL | e.g. `sheets`, `duvet-covers`, `pillowcases` |
| `created_at` | `timestamptz` NOT NULL, default `now()` | |

#### Indexes

- `products_category_idx` on `category` — catalog filter.
- `products_created_at_idx` on `created_at DESC` — sort-by-newest.

### `product_colors` *(M0.2.A)*

Per-product color palette. Variants and product_images FK into this table (via a composite FK that also pins `product_id`), which guarantees a variant's or image's color belongs to the correct product.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `product_id` | `uuid` NOT NULL → `products(id)` | `ON DELETE CASCADE` |
| `name` | `text` NOT NULL | human-readable label (e.g. `Білий`, `Сірий`) |
| `hex` | `text` NOT NULL | `#RRGGBB`; `CHECK` enforces format |

#### Constraints

- `UNIQUE (product_id, id)` — exists specifically to anchor the composite FKs from `variants` and `product_images`.
- `UNIQUE (product_id, name)` — no duplicate color names within a product.

#### Indexes

- `product_colors_product_id_idx` on `product_id` — palette lookup for a product.

### `variants` *(M0.2.A)*

Per-SKU row. Size, dimensions, price, and stock all live here. Color is referenced via `color_id`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `product_id` | `uuid` NOT NULL | see composite FK below |
| `color_id` | `uuid` NOT NULL | see composite FK below |
| `size` | `text` NOT NULL | customer-facing label (e.g. `Євро`, `Двоспальний`) |
| `width_cm` | `integer` NOT NULL | `CHECK (> 0)` |
| `length_cm` | `integer` NOT NULL | `CHECK (> 0)` |
| `price` | `integer` NOT NULL | in kopecks; `CHECK (>= 0)` |
| `stock_quantity` | `integer` NOT NULL, default `0` | `CHECK (>= 0)` |
| `description` | `text` NULL | optional per-variant override. `NULL` = inherit `products.description` |

#### Constraints

- `FOREIGN KEY (product_id) → products(id)` `ON DELETE CASCADE`
- `FOREIGN KEY (product_id, color_id) → product_colors(product_id, id)` `ON DELETE RESTRICT` — composite FK. Guarantees the referenced color belongs to the same product; blocks color deletion while variants reference it.
- `UNIQUE (product_id, size, color_id)` — one SKU per (product, size, color).

#### Indexes

- `variants_product_id_idx` on `product_id` — PDP lookup.
- `variants_color_id_idx` on `color_id` — "which variants use this color".

### `product_images` *(M0.2.A)*

Ordered gallery per product. URLs point to the `product-images` Supabase Storage bucket (introduced in M5.4). Images can be color-scoped or generic.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `product_id` | `uuid` NOT NULL | see composite FK below |
| `color_id` | `uuid` NULL | `NULL` = generic (shown for any color). Non-`NULL` = shown only when that color is selected. |
| `url` | `text` NOT NULL | full public URL |
| `alt` | `text` NOT NULL, default `''` | |
| `position` | `integer` NOT NULL, default `0` | ascending sort order |

#### Constraints

- `FOREIGN KEY (product_id) → products(id)` `ON DELETE CASCADE`
- `FOREIGN KEY (product_id, color_id) → product_colors(product_id, id)` `ON DELETE RESTRICT`. Composite FK with `MATCH SIMPLE` (Postgres default): when `color_id IS NULL`, the FK is skipped — exactly what we want for generic images.
- No uniqueness on `position`. Gallery rendering sorts by `(position, id)`; duplicates are tolerated so the admin can reorder without racing constraints.

#### Indexes

- `product_images_product_id_idx` on `product_id`.
- `product_images_color_id_idx` on `color_id` **WHERE `color_id IS NOT NULL`** — partial index; skips the generic-image rows since those aren't queried by color.

### `bundles` *(M0.2.B)*

A curated set of products sold together at a discount (наприклад: "Постільний комплект 'Ніжність'" = простирадло + підковдра + 2 наволочки, −15%).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `name` | `text` NOT NULL | Ukrainian display name |
| `description` | `text` NOT NULL, default `''` | |
| `category` | `text` NULL | Optional grouping axis (e.g. матеріал — cotton/linen). `NULL` = uncategorized. Independent from `products.category` (which is item type). |
| `discount_percent` | `integer` NOT NULL | 0..100; `CHECK (between 0 and 100)` |
| `created_at` | `timestamptz` NOT NULL, default `now()` | |

Bundle price is **computed**, not stored: `Σ (bundle_items.quantity × variant.price) × (100 − discount_percent) / 100`. Repository layer does the math at read time.

#### Indexes

- `bundles_created_at_idx` on `created_at DESC`.
- `bundles_category_idx` on `category` **WHERE `category IS NOT NULL`** — partial index; skips uncategorized rows.

### `bundle_items` *(M0.2.B)*

Members of a bundle. One row per unique SKU; `quantity` captures multiplicity (e.g. "2 наволочки білі" is one row with `quantity = 2`). Same product with different variants = separate rows.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `bundle_id` | `uuid` NOT NULL → `bundles(id)` | `ON DELETE CASCADE` |
| `product_id` | `uuid` NOT NULL | see composite FK below |
| `variant_id` | `uuid` NULL | `NULL` = customer picks at order time. Non-`NULL` = SKU locked. |
| `quantity` | `integer` NOT NULL, default `1` | `CHECK (>= 1)` |
| `position` | `integer` NOT NULL, default `0` | render order |

#### Constraints

- `FOREIGN KEY (product_id) → products(id)` `ON DELETE RESTRICT` — blocks deletion of a product that's used in any bundle; admin must remove from bundles first.
- `FOREIGN KEY (product_id, variant_id) → variants(product_id, id)` `ON DELETE RESTRICT` — composite FK. Guarantees the pinned variant belongs to the bundle_item's product; MATCH SIMPLE skips the check when `variant_id IS NULL`.
- `UNIQUE NULLS NOT DISTINCT (bundle_id, product_id, variant_id)` — prevents listing the same SKU twice in one bundle. `NULLS NOT DISTINCT` (Postgres 15+) makes two `variant_id = NULL` rows for the same product collide instead of slipping through.

#### Indexes

- `bundle_items_bundle_id_idx` on `bundle_id`.
- `bundle_items_product_id_idx` on `product_id` — reverse lookup ("which bundles use this product?").

### `bundle_images` *(M0.2.B)*

Ordered gallery per bundle. URLs point to the `product-images` Supabase Storage bucket (introduced in M5.4). No color-scoping — bundles span multiple products and colors, so per-color filtering doesn't apply.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `bundle_id` | `uuid` NOT NULL → `bundles(id)` | `ON DELETE CASCADE` |
| `url` | `text` NOT NULL | full public URL |
| `alt` | `text` NOT NULL, default `''` | |
| `position` | `integer` NOT NULL, default `0` | ascending sort order |

#### Constraints

- No uniqueness on `position`. Gallery rendering sorts by `(position, id)`; duplicates are tolerated so the admin can reorder without racing constraints.

#### Indexes

- `bundle_images_bundle_id_idx` on `bundle_id`.

### Companion constraint added in this migration

- `variants` gets a `UNIQUE (product_id, id)` — not for data validation (id alone is already unique), but to make the composite FK from `bundle_items` (and later `order_items`) legal at the SQL level.

### `orders` *(M0.2.C)*

A customer order. Created server-side only — the webhook handler creates it after Wayforpay confirms payment. Never created from client-reported success.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `status` | `text` NOT NULL | `CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))` |
| `customer_name` | `text` NOT NULL | |
| `customer_email` | `text` NOT NULL | |
| `customer_phone` | `text` NOT NULL | Required by Nova Poshta for delivery notifications. Stored as-entered (no normalization). |
| `shipping_address` | `jsonb` NOT NULL | Delivery details. Shape defined by checkout form (Nova Poshta branch or courier address) — see `specs/cart.md` (M2.1). |
| `payment_ref` | `text` NULL | Wayforpay `orderReference`. `NULL` until payment confirmed. Used for webhook idempotency checks. |
| `total_amount` | `integer` NOT NULL | Snapshot of order total in kopecks at purchase time. `CHECK (>= 0)` |
| `created_at` | `timestamptz` NOT NULL, default `now()` | |

#### Indexes

- `orders_status_idx` on `status` — admin order filtering.
- `orders_created_at_idx` on `created_at DESC` — order listing.
- `orders_customer_email_idx` on `customer_email` — look up orders by customer.
- `orders_payment_ref_idx` on `payment_ref` **WHERE `payment_ref IS NOT NULL`** — partial index for webhook idempotency lookup; skips `NULL` rows.

### `order_items` *(M0.2.C)*

Line items of an order. One row per unique SKU. Unlike `bundle_items`, `variant_id` is always non-`NULL` — the customer must select a variant before checkout.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `order_id` | `uuid` NOT NULL → `orders(id)` | `ON DELETE CASCADE` |
| `product_id` | `uuid` NOT NULL | see composite FK below |
| `variant_id` | `uuid` NOT NULL | see composite FK below |
| `bundle_id` | `uuid` NULL → `bundles(id)` | `NULL` = bought individually. Non-`NULL` = purchased as part of this bundle; explains any discount in `price_at_purchase`. `ON DELETE RESTRICT` |
| `quantity` | `integer` NOT NULL | `CHECK (>= 1)` |
| `price_at_purchase` | `integer` NOT NULL | Snapshot of `variants.price` in kopecks at purchase time. `CHECK (>= 0)` |

#### Constraints

- `FOREIGN KEY (product_id) → products(id)` `ON DELETE RESTRICT` — preserves order history; blocks product deletion if it appears in any order.
- `FOREIGN KEY (product_id, variant_id) → variants(product_id, id)` `ON DELETE RESTRICT` — composite FK. Guarantees the variant belongs to the correct product; reuses the `UNIQUE (product_id, id)` companion constraint added in `0002`.
- `FOREIGN KEY (bundle_id) → bundles(id)` `ON DELETE RESTRICT` — preserves order history; blocks bundle deletion if it appears in any order.
- `UNIQUE (order_id, variant_id)` — prevents the same SKU appearing twice in one order; use `quantity` for multiples.

#### Indexes

- `order_items_order_id_idx` on `order_id` — fetch all items for an order.
- `order_items_variant_id_idx` on `variant_id` — analytics: which variants sold.
- `order_items_bundle_id_idx` on `bundle_id` **WHERE `bundle_id IS NOT NULL`** — partial index for bundle sales analytics; skips individually-bought items.

## Invariants

- **Color belongs to product.** A variant's color and an image's color reference `product_colors` via a composite FK that also pins `product_id`. It is impossible at the DB layer for a variant of product A to reference a color of product B.
- **Price snapshot at purchase.** `order_items.price_at_purchase` (grows in M0.2.C) will snapshot the variant price at order time. Never read `variants.price` when rendering a historical order — always read the snapshot.
- **Transactional stock changes.** Stock changes go through the orders flow (M0.5) so decrement + order creation happen atomically. Ad-hoc UPDATEs bypassing that flow can break inventory accuracy.

## Future growth

| Milestone | Adds |
| --- | --- |
| M5.4 | `product-images` Supabase Storage bucket + Storage RLS policies (schema for color-scoping is already in place) |
