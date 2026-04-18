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

## Invariants

- **Color belongs to product.** A variant's color and an image's color reference `product_colors` via a composite FK that also pins `product_id`. It is impossible at the DB layer for a variant of product A to reference a color of product B.
- **Price snapshot at purchase.** `order_items.price_at_purchase` (grows in M0.2.C) will snapshot the variant price at order time. Never read `variants.price` when rendering a historical order — always read the snapshot.
- **Transactional stock changes.** Stock changes go through the orders flow (M0.5) so decrement + order creation happen atomically. Ad-hoc UPDATEs bypassing that flow can break inventory accuracy.

## Future growth

| Milestone | Adds |
| --- | --- |
| M0.2.B | `bundles`, `bundle_items` |
| M0.2.C | `orders`, `order_items` |
| M5.4 | `product-images` Supabase Storage bucket + Storage RLS policies (schema for color-scoping is already in place) |
