-- 0001 · products, product_colors, variants, product_images
--
-- Core catalog tables.
--   products        — catalog entry
--   product_colors  — per-product color palette, referenced by variants and images
--   variants        — per-SKU row (product × size × color). Price and stock live here.
--   product_images  — ordered gallery; color-scoped (non-null color_id) or generic (null)
--
-- Money is stored as integer kopecks (1 UAH = 100 kopecks) to avoid any
-- floating-point arithmetic on currency.
--
-- Cross-table invariant: a variant's color and an image's color must belong
-- to the variant's / image's product. Enforced by composite FKs into
-- product_colors(product_id, id). This rules out an admin-UI bug attaching a
-- color from product A to a variant of product B.

create extension if not exists "pgcrypto";

create table products (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  description text    not null default '',
  category    text    not null,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table  products             is 'Catalog entries. Size, color, price, stock live on variants.';
comment on column products.is_archived is 'Soft-delete: archived products are hidden from the storefront but preserved for order history.';

create index products_category_idx   on products (category)    where not is_archived;
create index products_created_at_idx on products (created_at desc);

create table product_colors (
  id         uuid not null default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null,
  hex        text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  primary key (id),
  unique (product_id, id),
  unique (product_id, name)
);

comment on table  product_colors     is 'Per-product color palette. Referenced by variants and product_images.';
comment on column product_colors.hex is 'Hex код у форматі #RRGGBB. Для кольорової плашки у каталозі.';

create index product_colors_product_id_idx on product_colors (product_id);

create table variants (
  id             uuid    primary key default gen_random_uuid(),
  product_id     uuid    not null,
  color_id       uuid    not null,
  size           text    not null,
  width_cm       integer not null check (width_cm > 0),
  length_cm      integer not null check (length_cm > 0),
  price          integer not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  description    text,
  is_archived    boolean not null default false,
  foreign key (product_id) references products(id) on delete cascade,
  foreign key (product_id, color_id) references product_colors(product_id, id) on delete restrict,
  unique (product_id, size, color_id)
);

comment on table  variants             is 'Per-SKU row. One per (product, size, color).';
comment on column variants.size        is 'Customer-facing size label ("Євро", "Двоспальний"). Точні розміри — у width_cm/length_cm.';
comment on column variants.price       is 'Ціна в копійках (1 UAH = 100 копійок). Integer, щоб уникнути помилок округлення.';
comment on column variants.description is 'Опціональний опис, що перекриває products.description для цього варіанту. NULL = успадкувати опис продукту.';
comment on column variants.is_archived is 'Soft-delete: archived variants are hidden from the storefront (size no longer available) but preserved for order history.';

create index variants_product_id_idx on variants (product_id) where not is_archived;
create index variants_color_id_idx   on variants (color_id);

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  color_id   uuid,
  url        text not null,
  alt        text not null default '',
  position   integer not null default 0,
  foreign key (product_id) references products(id) on delete cascade,
  foreign key (product_id, color_id) references product_colors(product_id, id) on delete restrict
);

comment on table  product_images          is 'Ordered gallery per product. URLs point to Supabase Storage.';
comment on column product_images.color_id is 'NULL = generic (shown regardless of selected color). Non-NULL = shown only when that color is selected.';

create index product_images_product_id_idx on product_images (product_id);
create index product_images_color_id_idx   on product_images (color_id) where color_id is not null;
