# Run rules (read first)

You are the builder for one job in the NikoForm repo (Next.js 16, Tailwind v4, pnpm). You are in a fresh git worktree on branch `ds/redesign-r1`, cut from `master` at `aa5ea82`.

- Work only inside this worktree. Do not touch any other folder.
- Allowed git: status, diff, add, commit on `ds/redesign-r1`. Forbidden: push, pull, fetch, merge, rebase, reset --hard, checkout or switch to another branch, tag, any remote change.
- Forbidden: any `prisma` command except what `pnpm install` runs on its own, any database access, editing `.env*` files other than the one below, adding or upgrading dependencies.
- Setup: run `pnpm install --frozen-lockfile`. If `next build` needs environment values, create `.env.local` with only these dummy lines and never commit it: `DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy`, `DIRECT_URL=postgresql://dummy:dummy@localhost:5432/dummy`, `AUTH_SECRET=dummy-build-secret-not-real`.
- Commit in a few logical commits with plain messages. Never use em dashes, en dashes, middle dots or bullet characters anywhere.
- When done, reply with: files changed (one line each), the last lines of each acceptance command, every git command you ran, and anything you skipped or could not do and why.

---

# Job brief: Redesign R1, tokens and primitives (palette A, Ink & Ember)

Status: approved by the owner 2026-11-02. Builder: Gemini 4 Argon (High) via T3 Code.
Parent brief: `.claude/handoffs/20261103-compact-redesign-brief.md`. Concepts: https://claude.ai/artifact/7VreWpU2pXqHVf14QndKsH (row A).
Branch: `ds/redesign-r1`, cut from `origin/master` at `aa5ea82`. Commits allowed on that branch only. No push, no merge, no database access, no `prisma` commands.

## Goal

Swap the colour, type, size and motion foundations to the compact Ink & Ember system and restyle the shared UI primitives. Pages keep their current layout; they should simply look like palette A at the new density. The sidebar shell, Overview rebuild and per-section passes are later phases (R2 to R4). Do not start them.

## Do not touch

- Anything in `prisma/`, `src/lib/actions/`, `src/app/api/`, route handlers, redirects.
- `src/components/templates/` (client card templates keep their own colours).
- `src/lib/theme.ts` and the `tokea-theme` key; the `@custom-variant dark` line in `globals.css`.
- No em dash, en dash, middle dot or bullet characters in code, comments, copy or commits.

## Steps

1. **Colour tokens, `src/app/globals.css`.** Replace the HSL triplets with hex values, keeping every existing variable name. `:root` gets the light column, `.dark` the dark column:

   | Variable | Light | Dark |
   |---|---|---|
   | `--background` | #FAFAF9 | #0E0E0D |
   | `--foreground` | #111110 | #EDEDEA |
   | `--card`, `--popover` | #FFFFFF | #161615 |
   | `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | #111110 | #EDEDEA |
   | `--muted`, `--secondary`, `--accent` | #F3F3F1 | #232320 |
   | `--muted-foreground` | #66655F | #9C9B95 |
   | `--border`, `--input` | #E5E4E0 | #2B2B28 |
   | `--primary`, `--ring` | #C4401A | #FF6A33 |
   | `--primary-foreground` | #FFFFFF | #170A04 |
   | `--brand` (accent text and links) | #B93C17 | #FF8A5C |
   | `--brand-foreground` | #FFFFFF | #170A04 |
   | `--destructive` | #B4232A | #FF6B6B |
   | `--destructive-foreground` | #FFFFFF | #1A0606 |
   | new `--signal` | #E8501C | #FF6A33 |
   | new `--tint` | #FCEDE7 | #2A1A12 |
   | new `--success` | #1A6B43 | #5CC98F |
   | new `--success-tint` | #E6F4EC | #14261C |
   | new `--destructive-tint` | #FBE9E9 | #2E1616 |
   | new `--sidebar` | #161615 | #161615 |
   | new `--sidebar-foreground` | #EDEDEA | #EDEDEA |
   | new `--sidebar-muted` | #9C9B95 | #9C9B95 |
   | new `--sidebar-border` | #2B2B28 | #2B2B28 |
   | new `--sidebar-active` | #232320 | #232320 |
   | new `--sidebar-primary` | #FF6A33 | #FF6A33 |

   In `@theme inline`, change every `hsl(var(--x))` to `var(--x)` and add `--color-*` entries for each new variable (`signal`, `tint`, `success`, `success-tint`, `destructive-tint`, `sidebar`, `sidebar-foreground`, `sidebar-muted`, `sidebar-border`, `sidebar-active`, `sidebar-primary`). Rewrite the palette comment block to describe Ink & Ember in one short paragraph.

2. **Convert every other `hsl(var(--...))` use** (about 61 across `src/`, including `src/app/landing.css`, `src/components/checklists/checklists.css`, `src/components/dashboard/scan-chart.tsx` and the rest of `globals.css`). `hsl(var(--x) / 0.5)` becomes `color-mix(in srgb, var(--x) 50%, transparent)`. Acceptance grep: `git grep -n "hsl(var(--" -- src` returns nothing.

3. **Motion tokens** in the `:root` block that holds `--ease` and `--fast`: add `--dur-1: 120ms`, `--dur-2: 180ms`, `--dur-3: 260ms`, `--ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`. Keep `--ease` and `--fast` as aliases (`--ease: var(--ease-out)`, `--fast: var(--dur-2)`) so the 13 existing uses keep working. Add a `prefers-reduced-motion: reduce` rule that sets transition and animation durations to 0.01ms.

4. **Type, `src/app/layout.tsx`.** Load `Geist` (weights 400, 500, 600, 700) and `Geist_Mono` (400, 500) from `next/font/google`; remove Inter and Manrope. Point `--font-sans` and `--font-display` both at Geist, `--font-mono` at Geist Mono, so the 58 existing `font-display` and font uses keep working. Body base size 13px with line-height 1.45 in the `body` rule; add `font-variant-numeric: tabular-nums` to a new `.nums` utility class.

5. **Primitives, `src/components/ui/`.** Keep every export name and variant name so callers do not break.
   - `button.tsx`: sizes `default` h-8 px-3 text-[13px], `sm` h-7 px-2.5 text-xs, `lg` h-9 px-4, `icon` h-7 w-7; font-medium; add variant `ink` (`bg-foreground text-background hover:bg-foreground/90`, font-semibold). Transitions use `duration-[var(--dur-1)]` with the out curve. Focus ring stays visible.
   - `input.tsx`, `select.tsx`: h-8, px-2.5, text-[13px], rounded-md. `textarea.tsx`: text-[13px], px-2.5 py-1.5.
   - `label.tsx`: text-xs font-medium.
   - `badge.tsx`: pill, `px-2 py-0.5 text-[11px] font-semibold`. Map variants onto tokens: `success` to `bg-success-tint text-success`, `warning` to `bg-tint text-brand`, `muted` to `bg-muted text-muted-foreground`, `destructive` to `bg-destructive-tint text-destructive`, `default` and `secondary` and `outline` keep their roles. Add an optional `dot` boolean prop that renders a 6px dot in the current text colour before the label.
   - `card.tsx`: `rounded-panel border bg-card`, no shadow; `CardHeader` p-4 with `space-y-1`, `CardTitle` text-[13px] font-semibold tracking-normal, `CardContent` p-4 pt-0, `CardFooter` p-4 pt-0.
   - `hold-to-confirm.tsx`, `copy-button.tsx`, `sonner.tsx`, `separator.tsx`: only restyle where they hard-code old sizes or colours.

6. **New primitives** (no callers yet; R2 and R3 use them):
   - `src/components/ui/segmented.tsx`: client component, props `options: {value, label, count?}[]`, `value`, `onValueChange`, `aria-label`. A `role="group"` track (`bg-muted rounded-[7px] p-0.5`) of `<button aria-pressed>` items, h-7 text-xs; the selected item is `bg-foreground text-background font-semibold`. Colour transitions at `--dur-2`.
   - `src/components/ui/stat-strip.tsx`: server-safe component, props `items: {label, value, note?, tone?: "default" | "positive"}[]`. Grid `repeat(auto-fit, minmax(150px, 1fr))` with `gap-px bg-border border rounded-panel overflow-hidden`; each cell `bg-card px-3.5 py-3`, label text-xs muted, value text-[26px] font-bold tracking-[-0.035em] tabular, note text-[11px] (success colour when positive).

## Acceptance (builder runs all and reports output)

- `pnpm typecheck`, `pnpm exec eslint src scripts`, `pnpm exec next build` pass.
- `git grep -n "hsl(var(--" -- src` is empty; `git grep -nE "Inter|Manrope" -- src/app/layout.tsx` is empty.
- No banned characters in the diff.
- Summary lists every file changed and any caller that needed a class change.

After you finish, Claude audits separately (you do not need to do this): screenshots at 1280 and 375, light and dark, of `/`, `/login`, `/dashboard`, `/dashboard/qr`, `/dashboard/forms`, `/dashboard/checklists` and one event page; check contrast of badges and buttons; check `git log`, `git reflog` and the commands the builder ran.
