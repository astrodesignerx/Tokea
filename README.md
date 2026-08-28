# Tokea

Event software for hosts: create a public event page, send one magic link per guest, collect RSVPs, and scan QR codes at the door.

Built with Next.js 16 (App Router), Prisma 7 + PostgreSQL, Auth.js v5, Tailwind CSS 4, and Resend for email.

## Getting started

```bash
pnpm install
```

Copy the environment template and fill it in:

```bash
cp .env.example .env.local
```

At minimum you need `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` (generate one with `npx auth secret`).

Apply migrations and generate the client:

```bash
pnpm db:deploy && pnpm db:generate
```

Run the dev server:

```bash
pnpm dev
```

The app runs on [http://localhost:3012](http://localhost:3012). The port matters — `AUTH_URL` and magic-link callbacks are bound to it.

## Signing in locally

Auth is passwordless: you enter an email and receive a magic link.

If `RESEND_API_KEY` is missing or invalid, **email delivery is skipped in development and the sign-in link is printed to the dev server console instead**. Look for:

```
[auth] Dev sign-in link for you@example.com:
http://localhost:3012/api/auth/callback/resend?...
```

Paste that URL into the browser to complete sign-in. In production a failed send throws instead, so a misconfigured provider surfaces as an error rather than a link that never arrives.

## Storage (event cover images)

Cover uploads go straight from the browser to Cloudflare R2 using a presigned URL — the file never passes through the Next.js server. Until R2 is configured, clicking **Upload image** fails with `Storage credentials are not configured`; everything else in the app works without it.

In the Cloudflare dashboard, under **R2 Object Storage**:

1. **Create a bucket.** Name it `tokea-covers` (or anything — set `STORAGE_BUCKET` to match).
2. **Copy your account ID** from the R2 overview page. Your endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `STORAGE_ENDPOINT`.
3. **Create an API token** — *Manage API tokens* → *Create API token* → permission **Object Read & Write**, scoped to that one bucket. The Access Key ID and Secret Access Key it shows are `STORAGE_ACCESS_KEY` and `STORAGE_SECRET_KEY`. The secret is shown once.
4. **Enable public access** — bucket *Settings* → *Public Development URL* → *Enable* (type `allow` to confirm). That gives `https://pub-<hash>.r2.dev`, which is `STORAGE_PUBLIC_URL`. It must be public: guests load cover images straight from it.

   ⚠️ **`r2.dev` is rate-limited and Cloudflare supports it for development only.** Before going to production, attach a custom domain to the bucket and point `STORAGE_PUBLIC_URL` at that instead. Do not CNAME your own domain to the `r2.dev` hostname — Cloudflare treats that as unsupported.
5. **Add a CORS policy** — bucket *Settings* → *CORS policy*. Without this the browser's `PUT` is blocked and uploads fail even with valid credentials:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3012", "https://your-production-domain.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Leave `STORAGE_REGION=auto` — R2 ignores regions but the S3 client requires the field.

Once the variables are filled in, verify them:

```bash
pnpm check:storage
```

That uploads a 1x1 test image through the real presign path, reads it back over the public URL, inspects the bucket's CORS policy, and deletes the test object. Each step reports separately, so a failure names the setting that is wrong.

Uploads are capped at 8 MB and restricted to JPEG, PNG, WebP, and AVIF. Both limits are enforced server-side in [`src/lib/storage.ts`](src/lib/storage.ts) before a URL is signed, and the signed URL expires after 60 seconds.

Any S3-compatible service works — point `STORAGE_ENDPOINT` elsewhere and the same variables apply.

## Payments (Paystack)

Only needed for paid events. Free events work with none of this set.

1. **Sign up** at [dashboard.paystack.com](https://dashboard.paystack.com). You can use test mode immediately; business verification is only required to accept real money.
2. **Copy the test keys** — *Settings → API Keys & Webhooks*. Take the **Test Secret Key** (`sk_test_…`) and **Test Public Key** (`pk_test_…`) into `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
3. **Set the webhook URL** on that same page to `https://<your-domain>/api/webhooks/paystack`. Test and live mode have separate fields. The secret key signs webhooks, so there is nothing else to configure.
4. **Verify** with `pnpm check:paystack`.

```bash
pnpm check:paystack
```

That confirms the key is valid, that KES is enabled on the account, and that the webhook accepts a correctly signed request while rejecting unsigned, wrongly signed, and tampered ones.

### Testing locally

Paystack cannot reach `localhost`, so the webhook will not fire during local development. Payments still complete: the confirmation page polls `/api/payments/status`, which verifies with Paystack directly and settles the payment itself. Both paths are idempotent, so whichever arrives first wins.

To exercise the real webhook locally, expose the app with a tunnel (`ngrok http 3012` or `cloudflared tunnel --url http://localhost:3012`) and point the test webhook URL at it.

Paystack's test M-Pesa number is **+254 710 000 000**, which needs no PIN or OTP.

### Before going live

- Confirm which way `percentage_charge` splits. Paystack's subaccount reference describes it as the commission the **main** account takes, while it is widely used as the share the **subaccount** receives. Create a test subaccount, run one transaction, and read the split off the verify response. Getting this backwards pays the wrong party and is invisible until settlement.
- Decide who bears the Paystack fee. The `bearer` field defaults to the main account — meaning Tokea pays the fee on every organiser's ticket.
- Check that deployment protection does not sit in front of `/api/webhooks/*`, or Paystack will retry into a login page for 72 hours.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3012 |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Create and apply a migration from schema changes (dev) |
| `pnpm db:deploy` | Apply pending migrations without generating new ones (CI/prod) |
| `pnpm db:status` | Show which migrations are applied or pending |
| `pnpm db:reset` | Drop and rebuild the database from migrations — **destroys all data** |
| `pnpm db:generate` | Regenerate the Prisma client into `src/generated/prisma` |
| `pnpm db:studio` | Prisma Studio |

## Changing the schema

The database is managed by Prisma Migrate. `prisma db push` is deliberately not wired up as a script — using it would apply changes without recording a migration, leaving the database drifted from `prisma/migrations`.

1. Edit `prisma/schema.prisma`
2. `pnpm db:migrate --name describe_your_change`
3. `pnpm db:generate`
4. Restart the dev server — Turbopack caches the generated client, so a running server keeps using the old one
5. Commit the new folder under `prisma/migrations/` alongside the schema change

In CI or production, run `pnpm db:deploy` — never `db:migrate`, which can prompt and can reset.

`prisma/migrations/0_init` is a baseline: it describes tables that already existed when Migrate was adopted and is marked applied rather than actually run. Check `pnpm db:status` before deploying to a fresh database.

`migrate dev` needs a non-pooled connection to create its shadow database, which is why `DIRECT_URL` exists separately from `DATABASE_URL`.

## Project layout

```
src/app/            Routes (dashboard, public event pages, invite/RSVP, API handlers)
src/components/     UI, event templates, guest management, check-in scanner
src/lib/            Auth, database, email, tokens, storage, server actions
src/generated/      Prisma client (generated — do not edit)
src/proxy.ts        Edge-level redirect for signed-out /dashboard visits
```

Authorization is enforced server-side: `requireUser()` in dashboard routes and `getOwnedEvent()` in every server action that touches an event. `proxy.ts` is only a fast redirect, not a security boundary.

Guest-facing links (invite, RSVP, check-in QR) are stateless HMAC tokens signed with `AUTH_SECRET` — see `src/lib/tokens.ts`.

## Cron

`vercel.json` schedules an hourly `GET /api/cron/reminders`, authorized with `Bearer $CRON_SECRET`.
