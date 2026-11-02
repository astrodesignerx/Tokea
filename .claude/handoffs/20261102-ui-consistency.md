# Task: Make the dashboard UI consistent (audit findings, part 2)
Project: C:\Users\ether\Documents\NikoForm. Next.js 16, React 19, Tailwind v4, shadcn-style components in `src/components/ui`. Read STATE.md first. Start from branch `fix/ui-dark-and-mobile` (it already fixes dark-mode contrast and phone overflow; do not redo those).

## DANGER: live database
`.env.local` points at the PRODUCTION database. Never run `prisma migrate|db|studio`, `pnpm db:*`, `pnpm dev`, `pnpm start`, `next dev`, `next start`, or scripts that import `src/lib/db.ts`. `next build` is fine. No schema changes.

## Goal
Every dashboard section looks like it belongs to the same product. Match the dominant pattern named below; change look only, never behaviour or copy meaning.

## Canonical patterns (copy these)
- Page shell: `mx-auto max-w-6xl px-4 py-10 sm:px-6` for list and detail pages; forms (new/edit) may stay `max-w-5xl`. Checklists keep their own grid.
- Back link: muted text link with ArrowLeft and the parent page name, as in `src/app/dashboard/companies/new/page.tsx:14-19`.
- h1: `font-display text-3xl font-medium tracking-tight`.
- Eyebrow: `nf-eyebrow` above the h1 on list, new and edit pages.
- Sections: `nf-eyebrow` h2 plus `nf-panel` blocks (`qr/[id]/page.tsx:129-165`). Stat tiles: number first in `font-display tabular-nums`, label under it (`analytics/page.tsx:48-51`).
- Tables: `nf-panel` wrapper, plain `text-xs text-muted-foreground` header, `divide-y` rows (`forms/page.tsx:74-87`).
- Empty states: dashed Card, `p-12`, brand icon, `font-display text-lg font-medium` heading, "Create your first X" button (`companies/page.tsx:54-65`).
- Status badges: `secondary` for Draft and Archived, sentence-case labels ("Draft", "Published", "Pending"), never raw lowercase enum values.
- Header actions: "New X" is a default-size primary Button with Plus icon. Secondary header actions (Edit, Branding) are outline default size with an icon.
- Archive/Restore and Download buttons: outline `size="sm"` with an icon, everywhere (QR, forms, checklists, company cards).
- Destructive actions: HoldToConfirm for anything that deletes data (`ui/hold-to-confirm.tsx`); red (`text-destructive`) for delete controls. Replace the browser `confirm()` in guest removal.
- Select fields: add one shared `src/components/ui/select.tsx` (native `<select>` styled exactly like `ui/input.tsx`) and use it in card-form, qr-code-form, form-builder and event-form. Leave checklists' `.cl-input` alone.
- Required-field asterisk: muted, via `<Label>` (`card-form.tsx:194-196`).
- Loading labels: use the single character "…" (e.g. "Saving…") everywhere.
- ExternalLink icon only for links that open a public page in a new tab; internal edit links use Pencil.

## Files (from the audit)
- Events: `src/app/dashboard/events/page.tsx`, `new/page.tsx`, `[eventId]/page.tsx`, `[eventId]/edit/page.tsx`, `[eventId]/guests/page.tsx`, `[eventId]/checkin/page.tsx`, `src/components/events/*` (guest-table, event-form).
- Checklists headings and empty state: `src/app/dashboard/checklists/page.tsx`, `[id]/page.tsx`, `src/components/checklists/checklist-sidebar.tsx`, `people-panel.tsx`, `task-row.tsx`.
- Forms: `src/components/forms/form-builder.tsx`, `response-summary.tsx` (single response delete gets HoldToConfirm).
- Cards and QR: `src/app/dashboard/companies/page.tsx`, `[slug]/page.tsx`, `src/app/dashboard/qr/page.tsx`, `qr/[id]/page.tsx`, `src/components/qr-codes/qr-downloads.tsx`, `qr-code-form.tsx`, `src/components/cards/card-form.tsx`.
- Analytics: `src/app/dashboard/analytics/page.tsx` (icons on edit links).
- Login and join headings: `src/app/login/page.tsx`, `src/app/join/[token]/page.tsx`.

## Acceptance
- `pnpm typecheck`, `pnpm exec eslint src scripts` (0 problems), `pnpm exec tsx scripts/check-forms.ts`, `pnpm exec tsx scripts/check-checklists.ts`, `pnpm exec next build` all pass.
- No new dependencies. No changes outside `src/`.
- No em dash, en dash, middle dot or bullet characters in any changed file.
- Every state change keeps its existing transition; new controls use the existing motion tokens (`--fast`, `--ease`).

## Report
DONE | CHANGED: <path>: <one line> | CHECKS: pass/fail each | NOTES: anything skipped or ambiguous
