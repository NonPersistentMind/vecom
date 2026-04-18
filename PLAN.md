# Build Plan — veganchic.com E-Commerce (Learning-Paced Milestones)

## Context

The working directory is empty except for [AGENTS.md](AGENTS.md). This is a greenfield rebuild of veganchic.store — a Ukrainian cotton-bedding e-commerce site.

The goal stated by the user is **50% product, 50% learning**. We therefore slice the 11-step build order from AGENTS.md into ~28 small, self-contained milestones, each landing on a single commit. After each commit I will pause so the user can read the diff, ask questions, and understand before we move on.

### Tech choices (locked in)

| Concern | Choice |
| --- | --- |
| Package manager | pnpm |
| UI | Tailwind CSS + shadcn/ui |
| UI copy language | Ukrainian |
| External services | None set up yet — account creation is baked into the relevant milestones |
| Framework, DB, auth, payments, email | Per AGENTS.md (Next.js 14+ App Router, Supabase, Auth.js v5, Wayforpay, Resend) |

### Working agreements

- **At least one commit per milestone.** Dense milestones are deliberately split into multiple commits — see the `⁂` marker throughout this plan. I pause after *every* commit (not just milestone boundaries) so you can read the diff, ask questions, and learn before the next one.
- Conventional Commits style: `feat:`, `chore:`, `fix:`, `refactor:` etc.
- **Specs are living, not upfront.** `specs/` starts as a skeleton in M0.1 and grows with the build. Every milestone that introduces or changes a subsystem includes a spec update *in the same commit* as the code. The spec files get created the first time we need them (e.g. `specs/payments-wayforpay.md` lands in M3.2, not earlier). If a spec update is substantial enough to deserve its own pause point, it becomes a sub-commit.
- Before writing mutation routes, `revalidatePath()` is wired *in the same commit* as the route — not deferred to a polish pass.
- Secrets only live in `.env.local` (gitignored) and Vercel env vars. The `.env.example` file is updated in the commit that introduces each secret.
- I never trust client-reported payment success (see M3.3).
- `⁂` in a milestone heading = multi-commit milestone with sub-commits explicitly listed.

### Spec map (which milestone creates/grows which spec file)

| Spec file | First created in | Grown by |
| --- | --- | --- |
| `specs/spec.md` (entry + TOC) | M0.1 | touched lightly in every phase as the TOC points to newly-minted sub-specs |
| `specs/data-model.md` | M0.2 (schema) | M0.4/M0.5 (repo semantics), M5.3 (admin mutations), M5.5 (image storage) |
| `specs/ui-style-guide.md` | M0.6 (shadcn + font) | M1.1 (header/footer), M1.3 (variant picker patterns) |
| `specs/storefront.md` | M1.1 | M1.2–M1.5 (catalog, detail, bundles), M2.2 (cart page), M3.1 (checkout) |
| `specs/cart.md` | M2.1 | M2.2, M2.3 |
| `specs/payments-wayforpay.md` | M3.2 (signing) | M3.3 sub-commits (webhook, idempotency, testing), M3.5 (email trigger) |
| `specs/email.md` | M3.5 | — |
| `specs/admin.md` | M4.1 (auth model) | M4.2, M5.1–M5.6 (each admin page adds a section) |
| `specs/api.md` | M5.3 (first API routes) | M5.4–M5.6 (more routes), M4.2 (auth requirements per route) |
| `specs/deployment.md` | M6.1 | M6.2 |

Each spec update lives in the same commit as the code that motivated it — so when you review a commit, spec diff and code diff sit side-by-side.

### Commit tally

| Phase | Milestones | Commits |
| --- | --- | --- |
| 0 — Foundation | 6 | 12 |
| 1 — Storefront reads | 5 | 8 |
| 2 — Cart | 3 | 3 |
| 3 — Checkout & payments | 5 | 9 |
| 4 — Admin auth | 2 | 3 |
| 5 — Admin CRUD | 6 | 8 |
| 6 — Ship | 2 | 2 |
| **Total** | **29** | **~45** |

~45 pause points for questions across the whole build. Spec file updates ride along inside code commits rather than getting their own dedicated ones — only M0.1 sub-commit B is a pure-spec commit, to lay the skeleton.

---

## Phase 0 — Foundation

### M0.1 · Scaffold Next.js app + specs skeleton ⁂
- Sub-commit A: `chore: scaffold next.js 14 app with tailwind + typescript`
  - `pnpm create next-app@latest` with TypeScript, Tailwind, ESLint, App Router, `src/` disabled, import alias `@/*`
  - `packageManager: pnpm@…` in `package.json`, add `.nvmrc`, short `README.md`
  - Verify: `pnpm dev` serves the default Next.js page
- Sub-commit B: `docs(spec): skeleton at specs/spec.md`
  - `specs/spec.md` with: one-line project summary, locked tech stack table, a "Living document" note, and a forward-looking TOC of sub-spec files that don't exist yet (each with a status marker like *`(grows in M0.2)`*). The skeleton sets the shape; sub-specs fill in as we build them.

### M0.2 · Supabase project + SQL schema ⁂
- User creates a Supabase project (I walk them through it)
- Sub-commit A: `feat(db): products, variants, product_images schema + indexes`
- Sub-commit B: `feat(db): bundles + bundle_items schema`
- Sub-commit C: `feat(db): orders + order_items schema with price_at_purchase`
- All three as separate files under `supabase/migrations/` (`0001_`, `0002_`, `0003_`). Splitting the migrations into three commits makes each subdomain's shape easier to inspect and discuss.
- Verify: tables visible in Supabase dashboard after each apply

### M0.3 · Supabase client + env + repo skeleton
- Install `@supabase/supabase-js`
- Create `lib/db/client.ts` exposing a single server-side Supabase client (service role key, server-only)
- Create `lib/db/types.ts` with TypeScript types mirroring the schema
- Create `lib/db/index.ts` as the re-export barrel
- Add `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- **Commit:** `feat(db): supabase client + repository layer skeleton`

### M0.4 · Products & variants repository ⁂
- Sub-commit A: `feat(db): products repository (get, create, update, delete)`
- Sub-commit B: `feat(db): variants repository (stock, price per size)`
- Each sub-commit includes a throwaway smoke test via a dev server-component page under `app/_dev/` so we see real data flowing before moving on.

### M0.5 · Bundles & orders repository ⁂
- Sub-commit A: `feat(db): bundles repository with joined bundle_items`
- Sub-commit B: `feat(db): orders repository — transactional create with stock decrement`
- Orders sub-commit is the bigger learning moment (Postgres transactions via Supabase RPC).

### M0.6 · shadcn/ui + Ukrainian typography ⁂
- Sub-commit A: `feat(ui): shadcn/ui init + base components`
  - `pnpm dlx shadcn@latest init`
  - Install `button`, `input`, `label`, `card`, `select`, `dialog`, `sheet`, `badge`, `separator`
- Sub-commit B: `feat(ui): cyrillic web font + lang=uk`
  - Inter or Manrope via `next/font/google` with Cyrillic subset
  - `<html lang="uk">` in `app/layout.tsx`

---

## Phase 1 — Storefront reads

### M1.1 · Route groups, layouts, homepage ⁂
- Sub-commit A: `feat(storefront): storefront route group + layout with header/footer`
- Sub-commit B: `chore(db): seed script for dev products`
- Sub-commit C: `feat(storefront): homepage with featured products (ISR 5min)`

### M1.2 · Product catalog
- `app/(storefront)/products/page.tsx` — grid of products, filter by category, sort by price/newest (search params → server-side query)
- `revalidate = 300`
- **Commit:** `feat(storefront): product catalog page`

### M1.3 · Product detail + variant selector ⁂
- Sub-commit A: `feat(storefront): product detail server component + image gallery`
- Sub-commit B: `feat(storefront): client-side variant picker with price/stock display`
- Add-to-cart placeholder button for now (wired in M2.3). On-demand ISR, no fixed revalidate.

### M1.4 · Bundle listing
- `app/(storefront)/bundles/page.tsx`
- **Commit:** `feat(storefront): bundle listing page`

### M1.5 · Bundle detail
- `app/(storefront)/bundles/[id]/page.tsx` — shows constituent products, discounted total
- **Commit:** `feat(storefront): bundle detail page`

---

## Phase 2 — Cart (client-side only)

### M2.1 · Cart state + localStorage
- `lib/cart/store.ts` — Zustand store (or React Context + `useSyncExternalStore`) persisted to localStorage, hydration-safe
- Cart item shape: `{ productId, variantId, quantity, priceSnapshot, nameSnapshot, imageSnapshot }` (snapshots avoid stale UI)
- **Commit:** `feat(cart): client-side cart store with localStorage`

### M2.2 · Cart page
- `app/(storefront)/cart/page.tsx` — line items, quantity +/-, remove, subtotal, "checkout" button
- **Commit:** `feat(cart): cart page UI`

### M2.3 · Add-to-cart wiring
- Wire up the button in product detail and bundle detail
- Header cart icon shows item count
- **Commit:** `feat(cart): add-to-cart from product and bundle pages`

---

## Phase 3 — Checkout & payments *(spikiest phase — Wayforpay is the risk)*

### M3.1 · Checkout form
- `app/(storefront)/checkout/page.tsx` — React Hook Form + Zod: name, email, phone, shipping address (Ukrainian format: місто, відділення Нової Пошти or вулиця/будинок/квартира)
- On submit, POST to a server action that returns a Wayforpay redirect URL
- **Commit:** `feat(checkout): checkout form with validation`

### M3.2 · Wayforpay payment initiation ⁂
- Sub-commit A: `feat(payments): wayforpay signing utilities with unit tests`
  - `lib/payments/wayforpay.ts` — `buildPaymentRequest` (HMAC-MD5 per Wayforpay spec), `verifyCallbackSignature` (constant-time compare). Unit-tested against Wayforpay's documented example vectors so we know the signing works before we go live.
- Sub-commit B: `feat(payments): pending order creation + wayforpay redirect`
  - Server action: creates `pending` order, returns form-POST redirect data for Wayforpay hosted page
  - Env: `WAYFORPAY_MERCHANT_ACCOUNT`, `WAYFORPAY_SECRET_KEY`, `WAYFORPAY_DOMAIN_NAME`
  - User creates Wayforpay test merchant during this sub-commit

### M3.3 · Wayforpay webhook ⁂ *(most complex milestone — deliberately small steps)*
- Sub-commit A: `feat(payments): webhook skeleton — parse + signature verify`
  - `app/api/webhooks/wayforpay/route.ts` accepts POST, parses, verifies signature, logs. Returns Wayforpay's required ack JSON shape. No DB writes yet.
- Sub-commit B: `feat(payments): webhook idempotency check on payment_ref`
  - Lookup existing order by `payment_ref`, short-circuit replays before mutating state.
- Sub-commit C: `feat(payments): webhook transitions order to paid + decrements stock`
  - Transactional state change (reuse `createOrder`/`updateOrderStatus` repo pattern).
- Sub-commit D: `docs: local webhook testing via cloudflared tunnel`
  - README snippet so the user can reproduce end-to-end testing later.

### M3.4 · Order confirmation page
- `app/(storefront)/order/[id]/page.tsx` — SSR, no cache; shows order details, thank-you message, next-steps copy in Ukrainian
- Cart is cleared on this page's mount
- **Commit:** `feat(storefront): order confirmation page`

### M3.5 · Resend confirmation email
- `lib/email/resend.ts` + React Email template for order confirmation
- Triggered from webhook handler (M3.3) after successful order transition — update that route in this commit
- User creates Resend account + verifies domain (or uses `onboarding@resend.dev` for dev)
- **Commit:** `feat(email): order confirmation via resend`

---

## Phase 4 — Admin authentication

### M4.1 · Auth.js v5 + login page ⁂
- Sub-commit A: `feat(auth): auth.js v5 credentials provider config`
  - Install `next-auth@beta` (v5). Credentials provider with bcrypt-hashed admin password in env.
  - `app/auth/[...nextauth]/route.ts`. Env: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`.
- Sub-commit B: `feat(auth): admin login page`
  - `app/auth/login/page.tsx` with Ukrainian copy, redirects to `/admin` on success.

### M4.2 · Middleware for /admin
- `middleware.ts` redirects unauthenticated `/admin/*` requests to `/auth/login`
- **Commit:** `feat(auth): middleware protecting /admin`

---

## Phase 5 — Admin CRUD

### M5.1 · Admin layout + dashboard
- `app/(admin)/admin/layout.tsx` with sidebar nav
- Dashboard shows KPI tiles (orders this month, revenue, low stock count)
- **Commit:** `feat(admin): layout + dashboard skeleton`

### M5.2 · Admin product list
- `app/(admin)/admin/products/page.tsx` — table of products with variant/stock summary, "new product" button
- **Commit:** `feat(admin): product list page`

### M5.3 · Admin product create/edit (no images yet) ⁂
- Sub-commit A: `feat(api): products POST/PATCH/DELETE with revalidatePath`
  - `/api/products/route.ts` (POST), `/api/products/[id]/route.ts` (PATCH, DELETE). Each mutation calls `revalidatePath('/products')` and the product detail path.
- Sub-commit B: `feat(api): variants PATCH with revalidatePath`
  - `/api/variants/[id]/route.ts` for stock/price updates.
- Sub-commit C: `feat(admin): product create/edit form with inline variants`
  - `app/(admin)/admin/products/[id]/page.tsx` — product fields + variant rows (size, price, stock). Uses React Hook Form + Zod.

### M5.4 · Image upload to Supabase Storage
- Create `product-images` bucket (public read, admin-only write via service key)
- Upload component in product edit form; stores `product_images` rows
- **Commit:** `feat(admin): product image upload to supabase storage`

### M5.5 · Admin orders
- `app/(admin)/admin/orders/page.tsx` — list + filter by status
- `PATCH /api/orders/[id]` for status transitions (pending → paid → shipped → delivered / cancelled)
- **Commit:** `feat(admin): order list + status updates`

### M5.6 · Admin analytics
- `app/(admin)/admin/analytics/page.tsx` — revenue this month, bestselling variants, low-stock alert list; all via repo functions hitting Supabase
- **Commit:** `feat(admin): analytics page`

---

## Phase 6 — Ship

### M6.1 · Vercel Analytics
- `@vercel/analytics` one-liner in root layout
- **Commit:** `feat: vercel analytics`

### M6.2 · Deploy
- Create Vercel project, wire env vars, point Wayforpay webhook + Resend domain at the Vercel URL
- Smoke-test end-to-end on the deployed URL
- **Commit:** `chore: production deployment configuration`

---

## Critical files (once scaffolded)

| Concern | File |
| --- | --- |
| Spec entry point | `specs/spec.md` |
| Data model spec | `specs/data-model.md` |
| Payments spec | `specs/payments-wayforpay.md` |
| API contract | `specs/api.md` |
| Repo barrel | `lib/db/index.ts` |
| Server-only Supabase client | `lib/db/client.ts` |
| Wayforpay signing | `lib/payments/wayforpay.ts` |
| Webhook | `app/api/webhooks/wayforpay/route.ts` |
| Auth config | `app/auth/[...nextauth]/route.ts` |
| Route protection | `middleware.ts` |
| Schema source of truth | `supabase/migrations/0001_init.sql` et seq. |

---

## Out of scope for this plan (per AGENTS.md)

Customer accounts, order history, wishlist, product search, discount codes, multi-language support.

---

## Verification

- After each milestone: `pnpm dev`, walk through the affected flow in the browser.
- After M3.3: full payment flow in Wayforpay test mode, confirm DB state transitions and idempotency (replay the webhook).
- After M4.2: confirm `/admin` redirects when logged out, works when logged in.
- After M6.2: one end-to-end purchase on the deployed URL using a test card.

---

## Pause-for-learning protocol

After every commit I stop and wait. The user asks questions about the diff, we discuss, and only then move to the next milestone. No batching.
