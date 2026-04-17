# E-Commerce Project — Master Prompt

> Use this prompt at the start of a new conversation to provide full context.
> Append the relevant **Build Order** section when focusing on a specific step.

---

## Project Overview

A full-stack e-commerce website for a Ukrainian shop selling cotton bedding:
sheets, duvet covers, pillowcases, and bundle sets.

Redesign of a [https://veganchic.store/](https://veganchic.store/) website

---

## Tech Stack


| Concern            | Choice                            | Notes                                                    |
| ------------------ | --------------------------------- | -------------------------------------------------------- |
| Framework          | Next.js 14+ (App Router)          | File-based routing, SSR, ISR, API routes                 |
| Deployment         | Vercel                            | Learning target; Hetzner VPS is future production target |
| Database           | Supabase (hosted Postgres)        | Swappable via repository layer                           |
| Image storage      | Supabase Storage                  | Swap to Cloudinary later if image transformations needed |
| Payments           | Wayforpay                         | Ukrainian market standard                                |
| Auth               | Auth.js v5 (Credentials provider) | One admin user; self-hosted, no third-party auth service |
| Email              | Resend                            | Order confirmations, shipping notifications              |
| Traffic analytics  | Vercel Analytics                  | Zero-config, one-line setup                              |
| Business analytics | Custom admin page                 | Queries Supabase directly                                |


---

## Critical Architectural Rule: Repository Layer

All database access goes through a repository layer at `lib/db/`.
API routes and Server Components **never** call Supabase directly — they call
repository functions. This keeps the database swappable (Supabase → raw
Postgres on Hetzner → anything else) without touching application code.

```
lib/
  db/
    products.ts    ← getProducts, getProductById, createProduct, updateProduct, deleteProduct
    variants.ts    ← getVariantsByProduct, updateVariantStock
    orders.ts      ← createOrder, getOrders, getOrderById, updateOrderStatus
    bundles.ts     ← getBundles, getBundleById, createBundle
    index.ts       ← re-exports everything
```

---

## Data Model

Stock is tracked **per variant**, not per product.
Prices live on variants, not on the product root.

```sql
-- Products
id, name, description, category, created_at
-- No price or stock here — those live on variants

-- Variants (e.g. Single / Double / King / Super King per product)
id, product_id, size, price, stock_quantity

-- Product images
id, product_id, url (Supabase Storage), alt, position

-- Bundles (e.g. sheet + duvet cover + pillowcase set)
id, name, description, discount_percent, created_at

-- Bundle items (which products/variants compose a bundle)
id, bundle_id, product_id, variant_id

-- Orders
id, status, created_at, customer_name, customer_email,
shipping_address (jsonb), payment_ref (Wayforpay), total_amount

-- Order items
id, order_id, product_id, variant_id, quantity, price_at_purchase
-- price_at_purchase stores price at time of order — never reference current price
```

---

## Route Structure

```
app/
  (storefront)/
    page.tsx                    ← homepage, featured products
    products/
      page.tsx                  ← catalog, filtering, sorting
      [id]/page.tsx             ← product detail, variant selector
    bundles/
      page.tsx                  ← bundle listing
      [id]/page.tsx             ← bundle detail
    cart/page.tsx               ← cart (localStorage, no login required)
    checkout/page.tsx           ← Wayforpay-powered checkout
    order/[id]/page.tsx         ← order confirmation

  (admin)/
    admin/
      page.tsx                  ← dashboard
      products/
        page.tsx                ← list all products
        [id]/page.tsx           ← edit product + variants
      orders/page.tsx           ← order list + status updates
      analytics/page.tsx        ← revenue, bestsellers, low stock

  api/
    products/
      route.ts                  ← GET (list), POST (create)
      [id]/route.ts             ← GET, PATCH, DELETE
    variants/
      [id]/route.ts             ← PATCH stock quantity
    bundles/
      route.ts                  ← GET, POST
      [id]/route.ts             ← GET, PATCH, DELETE
    orders/
      route.ts                  ← GET (admin only)
      [id]/route.ts             ← PATCH status (admin only)
    webhooks/
      wayforpay/route.ts        ← payment confirmation webhook

  auth/
    [...nextauth]/route.ts      ← Auth.js handler
    login/page.tsx              ← admin login page

  middleware.ts                 ← protects /admin, redirects to /auth/login
```

---

## Rendering Strategy


| Page               | Strategy         | Reason                             |
| ------------------ | ---------------- | ---------------------------------- |
| Homepage           | ISR, 5-min timer | Mostly static, speed matters       |
| Product catalog    | ISR, 5-min timer | Freshness not critical             |
| Product detail     | On-demand ISR    | Cache busted on stock/price update |
| Cart / Checkout    | Client only      | Per-user state, no caching         |
| Order confirmation | SSR, no cache    | Per-user, one-time page            |
| Admin panel        | SSR, no cache    | Always needs live data             |


`revalidatePath()` is called in any API route that mutates product or variant
data, ensuring the storefront cache is busted immediately on admin changes.

---

## API Routes

Serverless functions — no separate backend server needed.
All secrets (Supabase keys, Wayforpay keys) live in environment variables
and are never exposed to the browser.


| Route                     | Methods            | Notes                                        |
| ------------------------- | ------------------ | -------------------------------------------- |
| `/api/products`           | GET, POST          | List / create product                        |
| `/api/products/[id]`      | GET, PATCH, DELETE | PATCH calls `revalidatePath`                 |
| `/api/variants/[id]`      | PATCH              | Stock update, calls `revalidatePath`         |
| `/api/bundles`            | GET, POST          |                                              |
| `/api/bundles/[id]`       | GET, PATCH, DELETE |                                              |
| `/api/orders`             | GET                | Admin only                                   |
| `/api/orders/[id]`        | PATCH              | Update status, admin only                    |
| `/api/webhooks/wayforpay` | POST               | Verify signature → create order → send email |


---

## Authentication (Auth.js v5)

- Credentials provider (email + password)
- One admin user for v1
- Hashed password stored in environment variables
- `middleware.ts` redirects unauthenticated requests away from `/admin`
- Fully self-hosted — no third-party auth service, no cost, no dependency

---

## Payments (Wayforpay)

1. Server creates payment on Wayforpay API
2. Customer is redirected to Wayforpay hosted payment page
3. Wayforpay POSTs result to `/api/webhooks/wayforpay`
4. Webhook verifies signature, creates order in DB, triggers email via Resend

**Never trust client-reported payment success.**
The order is only created after the server-side webhook confirms payment.

---

## Analytics

- **Vercel Analytics** — traffic, pageviews, top pages. Enabled with one line, zero config.
- **Admin analytics page** — queries Supabase for: total orders, revenue this
month, bestselling products/variants, low stock alerts. No third-party service needed.

---

## Infrastructure Notes

- **Current target:** Vercel (free tier for development; Pro at $20/month when
the store goes commercial)
- **Future target:** Hetzner VPS + self-hosted Postgres. Same application code —
the repository layer handles database portability. Serverless functions become
a standard Node.js server.
- **Avoid Vercel-proprietary services:** Do not use Vercel KV, Vercel Blob, or
Vercel Postgres. Supabase Storage and Supabase Postgres are already
infrastructure-agnostic.
- `**revalidatePath` and `revalidateTag`** are Next.js core APIs, not
Vercel-specific. They work on self-hosted Next.js.

---

## Build Order (v1)

1. Scaffold Next.js project + configure Supabase schema + repository layer (`lib/db/`)
2. Product catalog and detail pages with variant selector
3. Bundle pages (listing + detail)
4. Cart (localStorage, client-side, no login required)
5. Wayforpay checkout integration + webhook handler
6. Order confirmation page + Resend confirmation email
7. Auth.js v5 setup + `middleware.ts` route protection
8. Admin: product + variant management (add / edit / delete + image upload)
9. Admin: order management (list + status updates)
10. Admin: analytics page (Supabase queries)
11. Vercel Analytics (one-line enable)

---

## Out of Scope for v1

Customer accounts, order history, wishlist, product search,
discount codes, multi-language support.

---

## How to Use This Prompt

- Paste this entire document at the start of a new conversation
- Append: **"Start with step N: [description]"** to focus on a specific build step
- The Wayforpay webhook (step 5) is the most complex piece — consider giving it
its own dedicated conversation
- Keep this file updated as decisions change

