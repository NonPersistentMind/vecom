-- 0004 · create_order RPC
--
-- Atomically create an order + its items, decrementing variant stock in the
-- same transaction. The whole function runs inside a single transaction — if
-- any step fails (insufficient stock, archived variant, invalid bundle), the
-- entire thing rolls back and no order or stock change is persisted.
--
-- The stock decrement uses a guarded UPDATE:
--     update variants set stock_quantity = stock_quantity - qty
--     where id = ... and stock_quantity >= qty
-- Zero rows returned → insufficient stock → exception → rollback.
-- Postgres takes a row-level lock on the variant for the life of the
-- transaction, so concurrent callers serialize cleanly: the slower one sees
-- the updated stock_quantity and either succeeds with less stock left or
-- fails the guard.
--
-- price_at_purchase is captured from the variant's current price (with bundle
-- discount applied if bundle_id is set), preserving order history against
-- later price changes.

create or replace function create_order(
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_shipping_address jsonb,
  p_items            jsonb  -- [{ product_id, variant_id, quantity, bundle_id? }]
) returns uuid
language plpgsql
as $$
declare
  v_order_id          uuid;
  v_item              jsonb;
  v_product_id        uuid;
  v_variant_id        uuid;
  v_bundle_id         uuid;
  v_quantity          integer;
  v_unit_price        integer;
  v_discount_percent  integer;
  v_price_at_purchase integer;
  v_total             integer := 0;
begin
  insert into orders (
    status, customer_name, customer_email, customer_phone,
    shipping_address, total_amount
  ) values (
    'pending', p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, 0
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_bundle_id  := nullif(v_item->>'bundle_id', '')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity < 1 then
      raise exception 'invalid quantity for variant %: %', v_variant_id, v_quantity;
    end if;

    update variants
      set stock_quantity = stock_quantity - v_quantity
      where id = v_variant_id
        and product_id = v_product_id
        and not is_archived
        and stock_quantity >= v_quantity
      returning price into v_unit_price;

    if not found then
      raise exception 'insufficient stock or invalid variant: %', v_variant_id;
    end if;

    if v_bundle_id is not null then
      select discount_percent into v_discount_percent
        from bundles
        where id = v_bundle_id and not is_archived;

      if not found then
        raise exception 'invalid or archived bundle: %', v_bundle_id;
      end if;

      v_price_at_purchase := (v_unit_price * (100 - v_discount_percent)) / 100;
    else
      v_price_at_purchase := v_unit_price;
    end if;

    insert into order_items (
      order_id, product_id, variant_id, bundle_id, quantity, price_at_purchase
    ) values (
      v_order_id, v_product_id, v_variant_id, v_bundle_id, v_quantity, v_price_at_purchase
    );

    v_total := v_total + (v_price_at_purchase * v_quantity);
  end loop;

  update orders set total_amount = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

comment on function create_order is
  'Atomically create an order with items and decrement variant stock. '
  'Raises an exception (and rolls back) on insufficient stock, archived variant, or invalid bundle. '
  'Returns the new order id.';
