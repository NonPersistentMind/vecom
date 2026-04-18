-- 0003 · orders, order_items
--
-- Orders are created server-side only, after Wayforpay confirms payment
-- via the webhook. Never created from client-reported success.
--
-- Two price-snapshot invariants:
--   1. order_items.price_at_purchase captures the variant price at purchase
--      time. Never substitute variants.price when rendering order history.
--   2. orders.total_amount is Σ (order_items.quantity × price_at_purchase),
--      stored so the order total is stable even after price changes.
--
-- The composite FK (product_id, variant_id) → variants(product_id, id)
-- reuses the UNIQUE (product_id, id) companion constraint added in 0002.

create table orders (
  id               uuid    primary key default gen_random_uuid(),
  status           text    not null check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  customer_name    text    not null,
  customer_email   text    not null,
  customer_phone   text    not null,
  shipping_address jsonb   not null,
  payment_ref      text,
  total_amount     integer not null check (total_amount >= 0),
  created_at       timestamptz not null default now()
);

comment on table  orders                  is 'Customer orders. Created server-side after Wayforpay webhook confirms payment.';
comment on column orders.status           is 'pending → paid → shipped → delivered; or cancelled at any point before delivered.';
comment on column orders.total_amount     is 'Snapshot of order total in kopecks at purchase time. Never recompute from current variant prices.';
comment on column orders.shipping_address is 'Delivery details JSON (Nova Poshta branch or courier address). Shape defined by checkout form — see specs/cart.md (M2.1).';
comment on column orders.payment_ref      is 'Wayforpay orderReference. NULL until payment confirmed. Used for webhook idempotency checks.';

create index orders_status_idx         on orders (status);
create index orders_created_at_idx     on orders (created_at desc);
create index orders_customer_email_idx on orders (customer_email);
create index orders_payment_ref_idx    on orders (payment_ref) where payment_ref is not null;

create table order_items (
  id                uuid    primary key default gen_random_uuid(),
  order_id          uuid    not null references orders(id) on delete cascade,
  product_id        uuid    not null,
  variant_id        uuid    not null,
  bundle_id         uuid    references bundles(id) on delete restrict,
  quantity          integer not null check (quantity >= 1),
  price_at_purchase integer not null check (price_at_purchase >= 0),
  foreign key (product_id) references products(id) on delete restrict,
  foreign key (product_id, variant_id) references variants(product_id, id) on delete restrict,
  unique (order_id, variant_id)
);

comment on table  order_items                   is 'Line items of an order. One row per unique SKU.';
comment on column order_items.price_at_purchase is 'Snapshot of variant price in kopecks at purchase time. Never substitute variants.price.';
comment on column order_items.bundle_id         is 'Set when this item was purchased as part of a bundle; NULL = bought individually. Explains discounted price_at_purchase.';

create index order_items_order_id_idx   on order_items (order_id);
create index order_items_variant_id_idx on order_items (variant_id);
create index order_items_bundle_id_idx  on order_items (bundle_id) where bundle_id is not null;
