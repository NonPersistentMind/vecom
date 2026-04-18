-- 0002 · bundles, bundle_items
--
-- A bundle is a curated set of products sold together at a discount
-- (наприклад "Постільний комплект 'Ніжність'" — простирадло + підковдра + 2 наволочки).
-- Each bundle_item references a product, optionally pinning a specific variant.
-- When variant_id is NULL, the customer picks the variant at order time.
-- Same product with different variants is represented as separate rows
-- (one row per unique SKU in the bundle, plus quantity).
--
-- Enables the composite FK (bundle_items → variants) by first adding a
-- companion UNIQUE constraint on variants(product_id, id) — id alone is
-- already the PK, but Postgres requires an explicit unique on the exact
-- column list for composite FKs.

alter table variants add constraint variants_product_id_id_key unique (product_id, id);

create table bundles (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null default '',
  category         text,
  discount_percent integer not null check (discount_percent between 0 and 100),
  created_at       timestamptz not null default now()
);

comment on table  bundles                  is 'Curated sets of products sold together at a discount.';
comment on column bundles.category         is 'Optional grouping axis (e.g. матеріал — cotton/linen). NULL = uncategorized.';
comment on column bundles.discount_percent is 'Застосовується до суми цін учасників, 0..100 (integer percent).';

create index bundles_created_at_idx on bundles (created_at desc);
create index bundles_category_idx   on bundles (category) where category is not null;

create table bundle_items (
  id         uuid primary key default gen_random_uuid(),
  bundle_id  uuid not null references bundles(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  quantity   integer not null default 1 check (quantity >= 1),
  position   integer not null default 0,
  foreign key (product_id) references products(id) on delete restrict,
  foreign key (product_id, variant_id) references variants(product_id, id) on delete restrict,
  unique nulls not distinct (bundle_id, product_id, variant_id)
);

comment on table  bundle_items            is 'Members of a bundle. One row per unique SKU; quantity captures multiplicity.';
comment on column bundle_items.variant_id is 'NULL = customer picks variant at order time. Non-NULL = this exact SKU is locked into the bundle.';
comment on column bundle_items.quantity   is 'Кількість одиниць цього SKU у комплекті (наприклад, 2 наволочки).';

create index bundle_items_bundle_id_idx  on bundle_items (bundle_id);
create index bundle_items_product_id_idx on bundle_items (product_id);
