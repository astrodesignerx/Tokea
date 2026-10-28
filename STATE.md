# NikoForm project state

## Goal and hard constraints
- NikoForm (formerly Tokea), live at https://nikoform.co.ke with active clients. Next.js 16 + Prisma 7 (Postgres on Supabase) on Vercel: digital business cards, events/RSVPs, and dynamic QR codes.
- The GitHub repo (`astrodesignerx/Tokea`), Vercel project (`tokea`) and local folder keep the old name. `tokea.vercel.app` still serves the same app.
- Deliberately unchanged old-name identifiers, because live data depends on them: `STORAGE_BUCKET=tokea-covers`, the `tokea-` Paystack reference prefix (`src/lib/paystack.ts`), the `@tokea.app` calendar UID (`src/lib/ics.ts`, changing it duplicates events in guests' calendars), and the `tokea-theme` storage key (`src/lib/theme.ts`).
- Printed cards and QR codes encode `https://nikoform.co.ke` (resolved at runtime by `getCardsOrigin` in `src/lib/cards/links.ts`).
- Printed short codes (`ContactCard.short_code`, `QrCode.short_code`) must never change or be reused.
- Redirects for printed codes are always 307 with `Cache-Control: no-store`, never 301/308.
- `.env.local` points `DATABASE_URL` and `DIRECT_URL` at Supabase, so the local dev server and `pnpm db:deploy` both use that database.
- Next.js refuses to run two `next dev` servers for this folder at once.

## Current status
- Dynamic QR codes (with iPhone/Android links, expiry, passwords, scheduled changes) are merged to `master` via https://github.com/astrodesignerx/Tokea/pull/1 (commit `b27e0f7`) and live on https://nikoform.co.ke since 2026-09-17.
- Migrations `20260916120000_add_dynamic_qr_codes`, `20260917120000_qr_code_designs` and `20260917180000_qr_code_density` are applied; production uses the same Supabase database as `.env.local` (confirmed by scanning a test code through production).
- Verified on production (2026-09-17, 17 checks): unknown and password codes, UTM tags, iPhone link, instant link edits, scan logging with device and country, owner-only downloads, existing card short links, and sign-in redirects on dashboard pages. Test codes were deleted afterwards; the QR tables held no client data at that point.
- Not yet verified in a browser: the signed-in dashboard pages (`/dashboard/qr`, create, edit, schedule, restore, downloads, Analytics). Claude cannot sign in; the owner must check these or sign in to a browser Claude can use.
- The local dev server on port 3012 hit a Turbopack internal error on 2026-09-16 and needs a manual restart. Workaround for local testing: `pnpm exec next build` then `pnpm exec next start -p 3014`.
- Merging to `master` from a Claude session needs the owner's approval; changes go through a PR.
- Forms (phase 1) is built on local branch `ds/forms` (base `6b2bf4a`, head `b6d7f21`, 6 commits), not pushed, merged or migrated. Built by DeepSeek V4.1 free on Zen (stopped by the Zen free usage limit near the end; Claude finished and committed the last step), reviewed by Codex, audited by Claude. Brief: `.claude/handoffs/20261027-1332-forms.md`; review prompt: `.claude/handoffs/20261027-forms-review.md`. Passing on the branch: `pnpm typecheck`, eslint on changed files, `pnpm exec prisma validate`, `pnpm exec tsx scripts/check-forms.ts`, `pnpm exec next build`. Codex's 3 findings (response-limit race, blank fill-time bypass, double QR creation) are fixed with row locks (`SELECT ... FOR UPDATE`) in `b6d7f21`.
  - Migration `20261027120000_add_forms` was applied to the shared Supabase database on 2026-10-27 (owner approved). Production code does not use the new tables until the PR is merged.
  - Browser-tested locally (`next start -p 3014`, launch config `nikoform-start`) on 2026-10-27 at phone width: public form renders; missing required rating is blocked; a bad phone number gets a server error and typed answers survive it; a valid answer saves (phone normalised to +254, device recorded, IP stored only as a 64-char hash) and lands on the thanks page; a closed form shows the closed message; an unknown slug and an anonymous CSV request return 404; CSV quoting and the formula guard work. The test form was deleted afterwards. Not tested: the signed-in dashboard (builder, responses, share, QR creation), since Claude cannot sign in.
  - Known quirk: the CSV formula guard also prefixes phone numbers (`'+254...`), because they start with `+`.
  - Next: owner reviews and merges the PR, then signs in and checks `/dashboard/forms`.
  - Tooling notes: the OpenCode Go API key expired 2026-10-27 (renew in OpenCode Console); Zen free models hit their usage limit the same day. Codex CLI lives at `C:\Program Files\WindowsApps\OpenAI.Codex_<version>\app\resources\codex.exe`; its Windows sandbox fails to run commands (`CryptUnprotectData failed`), so pass the diff in the prompt and use `codex exec -s read-only -o <file> -`. `codex exec review --base` cannot take custom instructions. Plan and screen concepts (revision 2): `.claude/artifacts/checklists-forms-plan.html` (master copy), published at https://claude.ai/artifact/5ATLRah1Z5i3STSPxdSJUa.
  - Owner confirmed 2026-10-27: Checklists means personal and team to-do lists. This replaced the first draft's staff inspection checklists run from a QR code, and the shared Forms/Checklists engine was dropped.
  - Forms (phase 1, branch `ds/forms`): `Form`, `FormVersion` (questions as versioned JSON), `FormResponse`; public pages at `/f/[slug]`, dashboard at `/dashboard/forms`, sharing through existing dynamic QR codes, CSV export, email alerts.
  - Checklists (phase 2, branch `ds/checklists`, independent of phase 1): `Checklist`, `ChecklistItem` (task or heading, assignee, due date, done by/at, position), `ChecklistMember` (owner | editor), `ChecklistInvite` (hashed token, 7-day expiry, email-bound), `ChecklistActivity`; dashboard at `/dashboard/checklists` with a "My tasks" view, invites accepted at `/join/[token]` via the existing email sign-in, list refresh every 15 s while visible.
  - Phase 3 (not costed): due-task emails via the existing Vercel cron, repeating lists, event prep lists, sub-tasks, attachments; for Forms a file question, logic, Paystack payment question, auto-delete, templates.
  - Migration must be additive only (shared live database).
  - Decided 2026-10-27 (owner accepted every recommendation): teammates sign in through email invites (free account, no share-link editing); invites are per list, not a company team; separate "Forms" and "Checklists" nav tabs with the tab row scrolling on phones; Forms ships first; free on all accounts; event RSVPs stay on their own code for now.
  - Forms form slugs are fixed once created, because QR codes made from the Share tab point at `/f/<slug>`.

## Decisions
- Standalone QR codes live in `QrCode` and resolve under `/q/<code>`, separate from card links under `/s/<code>`.
- Short codes come from one namespace across cards and QR codes (`src/lib/short-code-allocator.ts`).
- Destinations (main, iPhone, Android, after-expiry) must be absolute http(s) URLs (`normaliseDestination` in `src/lib/qr-codes/links.ts`).
- UTM tags are stored separately and appended at redirect time; tags already in the destination win.
- Redirect order in `src/app/q/[code]/route.ts`: paused or archived, expired, password, device link. Only forwarded scans are counted; each scan records `device` (ios, android, other).
- Expired codes go to `expired_destination`, or `/q` when it is blank, and skip the password.
- Passwords: salted scrypt hash in `password_hash`. A correct entry sets an httpOnly cookie scoped to `/q/<code>` for 12 hours, holding an HMAC (keyed by `AUTH_SECRET`) of the code and hash, so changing the password logs everyone out. Failed attempts are throttled in memory (5 per 10 minutes per IP and code, per server instance).
- Scheduled changes (`QrScheduledChange`) are applied lazily when a code is scanned or viewed in the dashboard, not by cron. Each is claimed with a conditional update in a transaction and logged to `QrLinkChange`.
- QR form layout (2026-09-17, replaced the long single-column form): Name and Destination always open; Style, Tracking tags, Device links, Expiry and Password fold into `FormSection` rows (`src/components/qr-codes/form-section.tsx`) whose headers summarise the current setting. Closed bodies stay mounted but `inert`, so their values still submit. Actions tag each validation error with a `section` and `errorAt`, and the form reopens that section. The Save button sits in a sticky bar with the error message.
- QR designs (2026-09-17): dot style (`square | rounded | dots | soft`), corner style (`square | rounded | circle`), optional corner colour, background (`white | transparent`) and an optional frame label (max 32 characters) on `QrCode`; defaults reproduce the original plain design. All drawing goes through `layoutQr` and `layoutToSvg` in `src/lib/qr-codes/design.ts`, so the dashboard preview, SVG and PDF (`src/lib/qr-codes/render.ts`, drawn with pdf-lib) always match. Error correction is always H; dots under the logo plate are left out. PNGs and PDFs are made in the browser (`src/components/qr-codes/qr-downloads.tsx`) because server-side rasterising needs a native library (sharp took the site down before). The PDF builder (`src/lib/qr-codes/pdf.ts`) is shared with the server; in the browser, SVG and other non-PNG/JPEG logos are drawn to a canvas and embedded as a 1200px PNG, so dashboard PDFs include SVG logos (the server fallback `/api/qr/[id]?format=pdf` still leaves them out). `/api/qr/[id]?format=logo` serves the logo same-origin for this, with a sandboxing CSP. `/api/qr/[id]?format=png` stays as a plain fallback. Company brand presets fill dot colour (brand_primary), corner colour (brand_accent) and logo.
- Density (2026-09-17): `detailed` encodes the link as written at error correction H (33x33 squares for a nikoform.co.ke link); `compact` encodes it in capitals (QR alphanumeric mode) at M, or Q with a logo (25x25, or 29x29 with a logo). `encodingFor` in `design.ts` decides this. Compact codes scan as `HTTPS://NIKOFORM.CO.KE/Q/CODE`, so `next.config.ts` rewrites `/Q/:code` to `/q/:code`; that rewrite must never be removed.
- Scan testing: 1,440 renders across both densities (compact also at 120px) decoded with zxing-wasm, as did browser-built PDFs with SVG logos (with and without width/height) and a PNG logo. Earlier: all 576 combinations (3 palettes, 4 dot styles, 3 corner styles, logo on/off, frame on/off, both backgrounds, at 180px and 600px) decoded with zxing-wasm, as did the server SVG and PDF output and the browser PNG path.
- Dates are stored in UTC; the browser converts to local time (`src/components/qr-codes/local-time.tsx`).
- Downloads (`/api/qr/[id]`) are owner-only because rendering fetches the logo URL server-side. Logo URLs must be https or a `/public` path.
- The Analytics page counts card and QR scans together, and lists QR codes in their own table. The "Companies" tile was replaced by "Active QR codes".
- `ensureScannableDark` lives in `src/lib/cards/qr-colour.ts` (browser-safe); `src/lib/cards/qr.ts` re-exports it.

## Specs: where things are
- Schema: `QrCode`, `QrScan`, `QrLinkChange`, `QrScheduledChange` in `prisma/schema.prisma`.
- Design drawing: `src/lib/qr-codes/design.ts` (pure, shared with the browser), `src/lib/qr-codes/render.ts` (server SVG and PDF).
- Public: `src/app/q/[code]/route.ts`, `src/app/q/[code]/unlock/page.tsx`, `src/app/q/page.tsx`.
- Actions: `src/lib/actions/qr-codes.ts`, `src/lib/actions/qr-unlock.ts`. Password helpers: `src/lib/qr-codes/password.ts`.
- Reads: `src/lib/qr-codes/data.ts`; analytics in `src/lib/cards/analytics.ts`.
- Dashboard: `src/app/dashboard/qr` (list, `new`, `[id]`); components in `src/components/qr-codes/`.
- Motion classes `qr-rise` and `qr-fade` at the end of `src/app/globals.css`.

## Open questions
- After each deploy, check production: `https://nikoform.co.ke/q/zzzzzzzz` should redirect (307) to `/q`; a 500 means production uses a different database that still needs `prisma migrate deploy`.
- Owner signs in and checks the dashboard pages and the unlock form in the browser.
- Before printing client codes: set `CARDS_URL` in Vercel if a custom domain is planned, since QR codes encode the origin and a domain change breaks printed codes.
- The password throttle is per server instance; use a shared store (database or Redis) if brute-force attempts become a concern.
- Pre-existing lint errors in `src/lib/cards/qr.ts` (two `any`, two unused variables).

## Sources
- Card short-link design: `src/app/s/[code]/route.ts`, `src/lib/cards/links.ts`.
