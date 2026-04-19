# UI Style Guide

Living rules for how the veganchic.com UI is written. Short entries, grown per milestone.

## Language

- All customer-facing copy is in **Ukrainian**. No English fallback strings.
- Root element: `<html lang="uk">` — set in [app/layout.tsx](../app/layout.tsx). Screen readers and search engines rely on this.
- Admin UI copy is also Ukrainian (one internal user; no reason to diverge).
- Internal identifiers (route names, component names, variable names, code comments) stay in English. Ukrainian is for *content*, not code.

## Typography

### Font families

| Family | Font | Subsets | Used for |
|---|---|---|---|
| Sans (default) | **Manrope** (variable) | `latin`, `cyrillic` | All body + UI text. Also used for headings. |
| Mono | **JetBrains Mono** | `latin`, `cyrillic` | Code snippets, numeric tables in admin. |

Both load via `next/font/google` in [app/layout.tsx](../app/layout.tsx) and expose CSS variables `--font-sans` / `--font-mono`, which [app/globals.css](../app/globals.css) wires into Tailwind's `@theme` block (`font-sans`, `font-mono`).

`display: "swap"` on both — we prefer a brief FOUT to an invisible layout while fetching the web font.

### Why Manrope

- Clean, warm, modern — fits a bedding brand aiming for "нежный, затишний".
- Full Cyrillic coverage including ґ, є, і, ї — no missing-glyph boxes in Ukrainian copy.
- Variable axis → no per-weight fetches.

### Subsets matter

Requesting only `latin` would cause Ukrainian characters to fall back to the system font, breaking typographic consistency. Always include `cyrillic` in the `subsets` array for any Google-font we add.

## Components

- Source of truth: [components/ui/](../components/ui/) (shadcn/ui, vendored — not an npm dependency).
- Base color: `neutral` (configured in [components.json](../components.json)).
- Theming via CSS variables in [app/globals.css](../app/globals.css) (`:root` for light, `.dark` for dark). Dark mode wiring exists but the storefront is light-only for v1.
- Adding a new shadcn component: `pnpm dlx shadcn@latest add <name>`. Commit the generated file.
- Editing a shadcn component's look: edit the file directly. That's the point of vendoring.

## Color tokens

Neutral grays from shadcn's `neutral` palette, in OKLCH. Full list in [app/globals.css](../app/globals.css). Accent colors for the brand land when we design the storefront (M1.1).
