# veganchic.com — Project Specification

Ukrainian cotton-bedding e-commerce storefront (sheets, duvet covers, pillowcases, and bundle sets). Rebuild of [veganchic.store](https://veganchic.store/).

> **Living document.** This spec grows in lockstep with the build. Each subsystem's detailed spec file is created in the milestone that first introduces it — see the TOC below for the schedule. When a code commit changes a subsystem, the matching spec file is updated in the same commit. Nothing here is written "upfront and set aside."

## Relationship to other project docs

| Doc | Role |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | The **brief** — what we're building, at a high level. Stable. |
| [specs/](.) (this directory) | The **detail** — how each subsystem works, grown per milestone. |
| [PLAN.md](../PLAN.md) | The **process** — milestone sequence + commit breakdown. |

## Tech stack (locked)

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Package manager | pnpm |
| Styling | Tailwind CSS 4 |
| UI components | shadcn/ui |
| Database | Supabase (hosted Postgres) |
| Image storage | Supabase Storage |
| Auth | Auth.js v5 (Credentials) |
| Payments | Wayforpay |
| Email | Resend |
| Traffic analytics | Vercel Analytics |
| Deployment | Vercel (short-term); Hetzner VPS (long-term target) |
| UI language | Ukrainian (`uk`) |

## Architectural rules

- **Repository layer at `lib/db/`.** API routes and Server Components never call Supabase directly — they call repository functions. Keeps the database swappable without touching application code.
- **Stock and price live on variants,** not products. `order_items.price_at_purchase` snapshots price at purchase time.
- **Never trust client-reported payment success.** Orders only transition to `paid` via the server-side Wayforpay webhook.
- **`revalidatePath()` is wired in the same commit** as any mutation route that affects storefront pages.
- **Secrets only in env vars.** Never exposed to the browser. `.env.example` is kept current.

## Specs index

Each row is a subspec file. "Status" shows which milestone introduces or grows the file (see `i-want-you-to-vivid-pike.md`). A `—` in Status means the file doesn't exist yet.

| File | Scope | Status |
| --- | --- | --- |
| [data-model.md](./data-model.md) | SQL schema, per-field docs, invariants, indexes | Created M0.2.A; grown M0.2.B, M0.2.C; grows M5.4 |
| [ui-style-guide.md](./ui-style-guide.md) | Ukrainian tone-of-voice, typography, color tokens, shadcn conventions | — *(grows in M0.6)* |
| [storefront.md](./storefront.md) | Public pages: homepage, catalog, product, bundles, cart, checkout | — *(grows in M1.1)* |
| [cart.md](./cart.md) | Cart state model, localStorage persistence, snapshot strategy | — *(grows in M2.1)* |
| [payments-wayforpay.md](./payments-wayforpay.md) | Signing, payment initiation, webhook contract, idempotency | — *(grows in M3.2)* |
| [email.md](./email.md) | Resend integration, templates, trigger points | — *(grows in M3.5)* |
| [admin.md](./admin.md) | Admin UX, auth model, per-page responsibilities | — *(grows in M4.1)* |
| [api.md](./api.md) | API route contract: method, path, body, response, auth, revalidated paths | — *(grows in M5.3)* |
| [deployment.md](./deployment.md) | Vercel config, env wiring, webhook URLs, domain setup | — *(grows in M6.1)* |

## Out of scope for v1

Per AGENTS.md: customer accounts, order history, wishlist, product search, discount codes, multi-language support.
