# Brief: NikoForm compact redesign (whole dashboard system)

Status: palette A (Ink & Ember) chosen by the owner 2026-11-02; B and C tables kept below for reference only. Layout approval, roadmap tiles and R5 scope still open. R1 job brief: `.claude/handoffs/20261103-redesign-r1.md`.
Visual concepts: https://claude.ai/artifact/7VreWpU2pXqHVf14QndKsH (source in `.claude/artifacts/compact-redesign/project/`).

## Goal

Make the signed-in dashboard minimal and compact: more on screen, less chrome, one consistent look across every section. Swap the current Supabase-style green palette for the chosen palette (light and dark). No feature changes, no data or route changes.

## Hard constraints (do not break)

- No change to Prisma schema, server actions, API routes, redirects or URLs.
- Keep these identifiers exactly: `tokea-theme` storage key (`src/lib/theme.ts`), `tokea-` Paystack prefix, `@tokea.app` ICS UID, `STORAGE_BUCKET=tokea-covers`.
- Printed short codes and the `/c`, `/q`, `/s`, `/e`, `/f` public routes keep their behaviour.
- Card templates in `src/components/templates/` are client-branded; leave their colours alone (phase R5 only touches their shell, if at all).
- Theme stays a user choice via `<html class="dark">`; the `@custom-variant dark` line in `globals.css` stays.
- No em dash, en dash, middle dot or bullet characters in any UI copy, comment or commit.
- Motion: transform and opacity only, tokens below, `prefers-reduced-motion` cuts to end states.

## Decisions (approved items marked when the owner signs off)

1. Layout: replace the 7 header tabs (`src/components/dashboard/dash-nav.tsx`) with a 208px left sidebar, grouped: Overview; Share (Cards, QR codes); Collect (Forms, Events); Plan (Checklists); Insights (Analytics). Counts sit at the right of Cards and QR codes. Account, theme toggle and sign out move to the sidebar foot. A 44px page bar holds the page title and the main action.
2. Phone (below 768px): sidebar hides; 52px top bar (wordmark, search, New) and a 5-item bottom tab bar (Home, Cards, QR, Events, More). "More" opens a sheet with Forms, Checklists, Analytics, account, theme, sign out. Touch targets stay at least 44px.
3. Home page (`src/app/dashboard/page.tsx`) becomes "Overview": one KPI strip (6 cells), a 14-day scans bar chart, recent activity, next event, today's checklist. The service description paragraphs go; the "not built yet" roadmap tiles move to a single muted line or are dropped (owner to confirm).
4. Type: Geist for everything, Geist Mono for codes, links and numbers. Drop Inter and Manrope from the dashboard (`src/app/layout.tsx`). The marketing page may keep Manrope for headlines until phase R5.
6. Visual impact (owner asked 2026-11-02): compact controls, loud hierarchy. Each screen gets one solid primary hero block (Overview: 14-day scans with a 60px number and bar chart; lists: a primary summary tile beside two plain tiles). The sidebar always uses the palette's dark surface, in light mode too, so the content sits in a dark frame. Page titles 30px/700, KPI values 26px/700 with tiny 7-bar sparklines, coloured type chips in activity lists, inline scan bars in tables, a progress ring on checklists, an ink date block on events. The main "New" button is ink (text colour on ground) so the primary colour stays reserved for the hero and data.
7. Search button (Ctrl K) is drawn in the concepts. Phase R2 ships it as a plain link-jump list (pages and recent items); a full command palette is a later feature, not part of this brief.

## Tokens

### Density

| Element | Now | New |
|---|---|---|
| App header | 56 | 44 page bar, sidebar 208 wide |
| Button default / sm / icon | 40 / 36 / 40 | 32 / 28 / 28 |
| Input, select, textarea line | 40 | 32 |
| Table row | about 46 (`py-3`) | 36, or 40 with a thumbnail chip (cell padding 12 by 6, header row 32) |
| Body text | 14 | 13; meta 12; badges 11 (600, pill shaped) |
| Display sizes | none | hero number 60/700, page title 30/700, KPI 26/700, letter-spacing -0.035em to -0.045em |
| Panel radius / control radius | 12 / 6 | 12 / 6; chips 7; pills 20 || Page width | `max-w-6xl` (1152) | fluid content, 1440 cap, 20px gutters (16 on phone) |
| Panel header | varies | 40 high, 13px semibold title, 1px rule below |

Spacing is a 4px grid: 4, 8, 12, 16, 20, 24, 32. Panels never use shadows; separation is 1px borders. KPI strips use the 1px-gap grid on a border-coloured background.

### Motion (replace `--ease` and `--fast` in `globals.css`)

- `--dur-1: 120ms` hover, press, focus
- `--dur-2: 180ms` menus, toggles, tabs, segmented controls
- `--dur-3: 260ms` drawers, sheets, dialogs
- `--ease-out: cubic-bezier(0.2, 0, 0, 1)`; `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`
- Sidebar active item: background fades in at `--dur-1`. Phone "More" sheet: slides up with `--dur-3`, scrim fades. Segmented control thumb slides with `--dur-2`. Rows and panels never animate on load.

### Colour roles

New role names, mapped onto the existing shadcn variables so most components need no class changes:

| Role | Maps to existing variable(s) | Use |
|---|---|---|
| bg | `--background` | page ground |
| surface | `--card`, `--popover` | panels, sidebar, inputs |
| subtle | `--muted`, `--secondary`, `--accent` | hover rows, active nav, segmented track, table head |
| border | `--border`, `--input` | every hairline |
| text | `--foreground` (+ all `*-foreground` on neutral surfaces) | body |
| muted | `--muted-foreground` | meta, labels, icons |
| primary / onPrimary | `--primary` / `--primary-foreground`, `--ring` = primary | main buttons, focus ring, selected state, chart highlight |
| accentText | `--brand` | links and accent text |
| signal (new) | `--signal` | wordmark mark, small highlights only, never text |
| tint (new) | `--tint` | accent badge background |
| success, successTint (new) | `--success`, `--success-tint` | Active badges, positive deltas |
| danger, dangerTint (new) | `--destructive`, `--destructive-tint` | errors, Expired badge, destructive buttons |
| sidebar (new) | `--sidebar`, `--sidebar-foreground`, `--sidebar-muted`, `--sidebar-border`, `--sidebar-active` | always the dark surface, text, muted, border and subtle values of the palette |

dangerTint values: A #FBE9E9 / #2E1616, B #FBEAEC / #2E1620, C #F9E7E4 / #2E1A15 (light / dark). On the ink date block, the month label uses A #FF6A33 / #B93C17, B #8EA4FF / #2443BD, C #E3A94F / #8A5A12 (light / dark) for contrast.

Switch the variables from bare HSL triplets to full colour values (hex) and update `@theme inline` to `--color-x: var(--x)`. Tailwind v4 opacity modifiers (`bg-primary/90`) still work. Check every `hsl(var(--` use in `src/` (including `landing.css`, `cards.css`, `not-found.css`) and convert it.

### Palette values (owner picks one; contrast checked, all text pairs 4.5:1 or better)

A, Ink & Ember

| Role | Light | Dark |
|---|---|---|
| bg | #FAFAF9 | #0E0E0D |
| surface | #FFFFFF | #161615 |
| subtle | #F3F3F1 | #232320 |
| border | #E5E4E0 | #2B2B28 |
| text | #111110 | #EDEDEA |
| muted | #66655F | #9C9B95 |
| primary / onPrimary | #C4401A / #FFFFFF | #FF6A33 / #170A04 |
| signal | #E8501C | #FF6A33 |
| accentText | #B93C17 | #FF8A5C |
| tint | #FCEDE7 | #2A1A12 |
| success / successTint | #1A6B43 / #E6F4EC | #5CC98F / #14261C |
| danger | #B4232A | #FF6B6B |

B, Midnight Cobalt

| Role | Light | Dark |
|---|---|---|
| bg | #F6F7F9 | #0A0F1D |
| surface | #FFFFFF | #10172A |
| subtle | #EFF1F5 | #1A2440 |
| border | #E0E4EB | #222C44 |
| text | #0E1526 | #E5E9F2 |
| muted | #586275 | #8F9AB0 |
| primary / onPrimary | #2B4FD8 / #FFFFFF | #6A87FF / #0A0F1D |
| signal | #2B4FD8 | #6A87FF |
| accentText | #2443BD | #8EA4FF |
| tint | #E9EEFE | #18224A |
| success / successTint | #17734F / #E5F4EE | #4CC79A / #10261F |
| danger | #C42B3B | #FF7A85 |

C, Evergreen & Sand

| Role | Light | Dark |
|---|---|---|
| bg | #F5F3EE | #11120F |
| surface | #FFFEFB | #181915 |
| subtle | #EEEBE4 | #25281F |
| border | #E1DDD3 | #2E3129 |
| text | #1A1916 | #ECE9E1 |
| muted | #67625A | #A39E92 |
| primary / onPrimary | #135A45 / #FFFFFF | #5CC79F / #0B241B |
| signal | #B7791F | #E3A94F |
| accentText | #8A5A12 | #E8B567 |
| tint | #F6ECDC | #2B2416 |
| success / successTint | #135A45 / #E3EFE9 | #5CC79F / #15271F |
| danger | #B42318 | #FF8070 |

## Phases (one builder job and one branch each, in order)

- **R1 Tokens and primitives** (`ds/redesign-r1`): `globals.css` palette, density and motion tokens; `src/app/layout.tsx` fonts; restyle `src/components/ui/*` (button, input, select, textarea, badge, card, label, separator, hold-to-confirm, copy-button, sonner) to the new sizes; add `Segmented` and `StatStrip` primitives. Acceptance: `pnpm build` passes; no page layout edits yet; all four badge tones exist.
- **R2 App shell** (`ds/redesign-r2`): `src/app/dashboard/layout.tsx` sidebar and page bar; replace `dash-nav.tsx` with `sidebar-nav.tsx` and `mobile-tabbar.tsx` plus the More sheet; search button opens a simple jump list. Acceptance: every dashboard route renders inside the shell at 1280 and 375 with no horizontal scroll; active item correct on nested routes; keyboard focus visible.
- **R3 Overview** (`ds/redesign-r3`): rebuild `src/app/dashboard/page.tsx` as drawn (KPI strip, scans chart from existing `CardScan` and `QrScan` counts, recent activity, next event, today's checklist). Use existing data helpers; no new tables. Acceptance: counts match the old hub.
- **R4 Section density pass** (`ds/redesign-r4`, may split per section): companies and cards, QR codes, forms, events (detail, guests, check-in, edit), checklists, analytics. Tables at 36px rows, toolbars with search plus segmented filters, panel headers at 40px, forms at 32px controls. Acceptance: each route checked at 1280 and 375, light and dark; no behaviour change.
- **R5 Public and marketing pages** (`ds/redesign-r5`, optional, owner to confirm): apply tokens and type to `/` landing, `/login`, `/signup`, RSVP, public forms and check-in. Card templates keep their own colours.

Each phase: builder (oc-deepseek), review (oc-glmflash), Claude audit with screenshots at 1280 and 375 in both themes, then owner merge.

## Open questions

- Palette: decided, A (Ink & Ember).
- **Blocking for R2: approve the sidebar layout and phone tab bar?** (R1 does not depend on it.)
- Drop or keep the "not built yet" roadmap tiles on Overview?
- Include R5 (public and marketing pages) in this redesign, or keep it for later?
