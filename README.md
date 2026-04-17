# veganchic.com

Ukrainian cotton-bedding e-commerce storefront (rebuild of [veganchic.store](https://veganchic.store/)).

See [AGENTS.md](AGENTS.md) for the full project brief and build order.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Auth.js v5 · Wayforpay · Resend.

## Develop

```sh
nvm use          # Node 22 (see .nvmrc)
pnpm install
pnpm dev         # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the built app |
| `pnpm lint` | ESLint |
