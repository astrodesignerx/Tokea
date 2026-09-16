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
- Migration `20260916120000_add_dynamic_qr_codes` is applied; production uses the same Supabase database as `.env.local` (confirmed by scanning a test code through production).
- Verified on production (2026-09-17, 17 checks): unknown and password codes, UTM tags, iPhone link, instant link edits, scan logging with device and country, owner-only downloads, existing card short links, and sign-in redirects on dashboard pages. Test codes were deleted afterwards; the QR tables held no client data at that point.
- Not yet verified in a browser: the signed-in dashboard pages (`/dashboard/qr`, create, edit, schedule, restore, downloads, Analytics). Claude cannot sign in; the owner must check these or sign in to a browser Claude can use.
- The local dev server on port 3012 hit a Turbopack internal error on 2026-09-16 and needs a manual restart. Workaround for local testing: `pnpm exec next build` then `pnpm exec next start -p 3014`.
- Merging to `master` from a Claude session needs the owner's approval; changes go through a PR.

## Decisions
- Standalone QR codes live in `QrCode` and resolve under `/q/<code>`, separate from card links under `/s/<code>`.
- Short codes come from one namespace across cards and QR codes (`src/lib/short-code-allocator.ts`).
- Destinations (main, iPhone, Android, after-expiry) must be absolute http(s) URLs (`normaliseDestination` in `src/lib/qr-codes/links.ts`).
- UTM tags are stored separately and appended at redirect time; tags already in the destination win.
- Redirect order in `src/app/q/[code]/route.ts`: paused or archived, expired, password, device link. Only forwarded scans are counted; each scan records `device` (ios, android, other).
- Expired codes go to `expired_destination`, or `/q` when it is blank, and skip the password.
- Passwords: salted scrypt hash in `password_hash`. A correct entry sets an httpOnly cookie scoped to `/q/<code>` for 12 hours, holding an HMAC (keyed by `AUTH_SECRET`) of the code and hash, so changing the password logs everyone out. Failed attempts are throttled in memory (5 per 10 minutes per IP and code, per server instance).
- Scheduled changes (`QrScheduledChange`) are applied lazily when a code is scanned or viewed in the dashboard, not by cron. Each is claimed with a conditional update in a transaction and logged to `QrLinkChange`.
- Dates are stored in UTC; the browser converts to local time (`src/components/qr-codes/local-time.tsx`).
- Downloads (`/api/qr/[id]`) are owner-only because rendering fetches the logo URL server-side. Logo URLs must be https or a `/public` path.
- The Analytics page counts card and QR scans together, and lists QR codes in their own table. The "Companies" tile was replaced by "Active QR codes".
- `ensureScannableDark` lives in `src/lib/cards/qr-colour.ts` (browser-safe); `src/lib/cards/qr.ts` re-exports it.

## Specs: where things are
- Schema: `QrCode`, `QrScan`, `QrLinkChange`, `QrScheduledChange` in `prisma/schema.prisma`.
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
- PNG downloads have no centre logo (same as cards; SVG and PDF do).
- Pre-existing lint errors in `src/lib/cards/qr.ts` (two `any`, two unused variables).

## Sources
- Card short-link design: `src/app/s/[code]/route.ts`, `src/lib/cards/links.ts`.
