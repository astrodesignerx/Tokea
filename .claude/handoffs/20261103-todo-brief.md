# Job brief: To-do (a "To-do" field for Forms)

Status: approved by the owner 2026-11-03. Builder: Codex (gpt-6.1-sol) via T3 Code. Reviewer: a separate review pass after the build.
Branch: `ds/todo`, cut from `ds/redesign-r1` at `4fd7ef7` so it can use the R1 primitives (`StatStrip`, `Badge`, `Button`). It merges only after R1 merges.

## Rules for the builder (read first)

- Work only inside this project folder. Commit on `ds/todo` only, in a few logical commits with plain messages.
- Forbidden git: push, pull, fetch, merge, rebase, reset --hard, checkout or switch, tag, any remote change.
- Forbidden: any `prisma` command, any database access, editing `prisma/`, editing `.env*` files, adding or upgrading dependencies.
- If `next build` needs env values, use the existing dummy `.env.local`. Never commit it.
- Never use em dashes, en dashes, middle dots or bullet characters anywhere (code, comments, copy, commits).
- Do not touch: `prisma/`, `src/app/api/`, `src/components/templates/`, `src/lib/theme.ts`, redirects, anything QR or card related.
- Report at the end: files changed (one line each), last lines of every acceptance command, every git command you ran, anything skipped and why.

## Goal

A business owner sends a client a public form link with a list of services, so the client can tick the ones they want, like a to-do list. The client ticks what they want (and a quantity where allowed), sees a running total, and submits. The owner sees the picks on the response page and can turn them into a private Checklist with one click.

No schema change: form fields already live in JSON (`Form.draft_fields`, `FormVersion.fields`), and answers in `FormResponse.answers` JSON.

## Decisions already made (do not change)

- It is a new field type `todo` inside Forms, not a new feature area. User-facing name everywhere: "To-do". Use `todo` in code names (types, helpers, components).
- Prices are integers in KES minor units, parsed with `toMinorUnits` and shown with `formatMoney` from `src/lib/money.ts`. Never floats.
- Pricing display is set per field: `exact` (shows "KES 15,000"), `from` (shows "From KES 15,000"), `hidden` (no prices, no total).
- Quantity is optional per item: each item has `max_qty` (1 means a tick box, 2 to 20 means a small stepper).
- No payment or deposit in this job. That is a later Paystack job.
- The total shown to the client is an estimate; the server recomputes it from the frozen version, never trusts the browser.

## Steps

1. **`src/lib/forms/fields.ts`**
   - Add `"todo"` to `FIELD_TYPES`, label `"To-do"`, and put it first in the `"Choice"` group.
   - Add to `FormField`: `price_display?: "exact" | "from" | "hidden"` and `services?: ServiceItem[]`, where `ServiceItem = { id: string; name: string; note?: string; image_url?: string; price?: number; max_qty: number }`. Item ids use `newFieldId()` and stay stable across versions.
   - Limits: `MAX_SERVICES = 30`, name 80 chars, note 200 chars, `max_qty` 1 to 20, price 0 to 1,000,000,000 minor units, `image_url` must start with `https://` and be at most 500 chars.
   - `parseFields`: validate all of the above with the same plain-English error style ("Question 3 needs at least one service."). Default `price_display` to `"exact"`, `max_qty` to 1. Reject duplicate item ids and duplicate names.
   - `fieldSchema`: the answer is `Record<itemId, number>`: only known item ids, each an integer from 1 to that item's `max_qty`; drop zero entries; `required` means at least one item picked. Store nothing when nothing is picked and the field is optional.
   - `readAnswers`: the public form posts one input per item named `<fieldId>.<itemId>` holding the quantity ("0" or missing means not picked). Build the record from those.
   - Add a pure helper `todoTotal(field, answer): number | null` (minor units; null when `price_display` is `hidden` or no picked item has a price). Export it so the server, response page and CSV share it.

2. **Builder UI, `src/components/forms/form-builder.tsx`**
   - Editor for a to-do field: a pricing select (`exact` / `from` / `hidden`), then a compact list of items. Each row: thumbnail button, name, note, price in KES (text input, parsed with `toMinorUnits`), max quantity. Add, remove, move up, move down.
   - Thumbnail upload reuses the existing `POST /api/uploads/cover` presign route the same way `src/components/event/cover-upload.tsx` does (copy its flow into a small shared helper or component if that is cleaner; do not edit the route). Show a 40px square preview with a remove button.
   - Use R1 primitives and tokens only (`Input`, `Button`, `Label`, `Badge`, `bg-muted`, `border`, `rounded-panel`). Transitions use `--dur-1` / `--dur-2` with `--ease-out`.

3. **Public form, `src/components/forms/public-form.tsx`**
   - Render the to-do field as a compact grid of cards: `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, 2 columns on a 375px phone. Each card: square image (or a neutral `bg-muted` tile with the first letter when there is no image), name, note (2 lines max), price line per `price_display`.
   - Picking: the whole card is a button with `aria-pressed`; picked cards get a `--primary` 2px ring and a check badge. If `max_qty > 1`, a picked card shows a minus / count / plus stepper (44px touch targets on phones).
   - Hidden inputs `<fieldId>.<itemId>` carry the quantities so the existing server action submits them.
   - A sticky total bar at the bottom of the viewport while any item is picked: "3 services | Estimated KES 45,000" and the submit button. Hidden when `price_display` is `hidden` (then show only the count). It slides up with transform and opacity at `--dur-3`; honour reduced motion.
   - Keyboard: every card and stepper button reachable by Tab, visible focus ring.

4. **Server, `src/lib/actions/form-submit.ts`**: no new logic beyond what `buildAnswerSchema` and `readAnswers` now do. Confirm the existing flow stores the record unchanged. The notification email stays a link only.

5. **Owner views**
   - `src/components/forms/response-summary.tsx`: for a to-do field, show how often each service was picked (count and total quantity), sorted by most picked.
   - The single response view in `src/app/dashboard/forms/[id]/page.tsx` (or the component it renders): list picked services as "Logo concepts x 3, KES 45,000", then the total computed by `todoTotal` from that response's frozen version, using the `.nums` class.
   - `src/lib/forms/csv.ts`: one column per to-do field, cell text like `Logo concepts x3; Brand guide x1`, plus a `<label> total (KES)` column when prices are shown.

6. **"Turn into checklist"**
   - New server action `createChecklistFromResponseAction` in `src/lib/actions/checklists.ts`. It loads the response with its form, checks the signed-in user owns the form (return "Response not found." otherwise, same as other actions), and creates a personal Checklist titled `"<form title>: <first short_text or email answer, else submitted date>"`. One task per picked service: title `"<name>"` or `"<name> x <qty>"`, notes set to the item's note. Then redirects to the new checklist.
   - Calling it twice for the same response must not make a second list: store nothing new in the database; instead look for an existing checklist owned by the user whose title matches exactly and reuse it. (Simple and good enough for v1.)
   - Button "Turn into checklist" on the single response view, only when the response has at least one picked service.

7. **Checks, `scripts/check-forms.ts`**: add cases for `parseFields` (good to-do field, missing name, duplicate ids, bad price, bad `max_qty`, non-https image) and for `buildAnswerSchema` (unknown item id rejected, qty above max rejected, zero dropped, required with nothing picked rejected) and `todoTotal` (exact, hidden, mixed priced and unpriced). Run it with `pnpm exec tsx scripts/check-forms.ts`.

## Acceptance (builder runs all and reports output)

- `pnpm typecheck`, `pnpm exec eslint src scripts`, `pnpm exec next build` pass.
- `pnpm exec tsx scripts/check-forms.ts` passes, including the new cases.
- `git diff --stat 4fd7ef7` touches nothing under `prisma/`, `src/app/api/`, `src/components/templates/`.
- No banned characters in the diff: `git diff 4fd7ef7 | python -c "import sys;d=sys.stdin.buffer.read().decode('utf-8');print([c for c in d if c in '–—·•'])"` prints `[]`.
- Existing form field types behave exactly as before (the existing check-forms cases still pass).

## After the builder (Claude does this, not the builder)

A review pass, then Claude audits: a signed-in run with a throwaway account building a 4-item to-do (one with qty, one unpriced, one with image), submitting it at 375px and 1280px in light and dark, checking the response view, CSV and the checklist it makes, then deleting the throwaway data.
