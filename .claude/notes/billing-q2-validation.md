# Billing Q2 validation

Date: 2026-11-04. Builder: Codex. Clone: `C:/Users/ether/Documents/NikoForm-q1`. Branch: `ds/billing-q2`. Starting commit: `2eb1833`, on Q1 `e1dc745`.

## Result

Implemented the three public templates and private Astro template, database-row view model, local fonts, bounded raster-logo loader, owner-scoped PDF route, View/Download actions and editor/settings swatches. No schema, environment, dependency or remote changes. The small package file in the PDF directory marks only that directory as ESM; it declares no dependencies. The scripts load the renderer with dynamic import because tsx's CommonJS path cannot resolve an import-only transitive renderer export on Node 24. Native Node loads the renderer successfully.

The Next config externalises the renderer, traces the local font files for the dynamic PDF route and pins Turbopack to this clone. Before the root was pinned, Next inferred the user's home workspace. The dynamic-route brackets in the tracing glob are escaped for picomatch.

## Acceptance results

Commands use `pnpm.cmd`, the Windows entry point for pnpm. The initial attempts with plain `pnpm` were stopped by PowerShell's script execution policy before starting the checks. No policy was changed.

| Command | Exit | Last meaningful lines |
| --- | --- | --- |
| `pnpm exec tsx scripts/check-billing-pdf.ts` | 0 | `Billing PDF checks passed: templates, pagination, models, private-template guard and logo limits.` |
| `pnpm exec tsx scripts/render-billing-samples.tsx` | 0 | `Wrote 16 billing sample PDFs to tmp/billing-samples.` |
| `pnpm exec tsx scripts/check-billing-totals.ts` | 0 | `Billing checks passed: integer rounding, VAT, limits, numbering, dates, statuses and validation.` |
| `pnpm typecheck` | 0 | `$ tsc --noEmit`, no TypeScript diagnostics |
| `pnpm exec eslint src scripts` | 0 | No ESLint diagnostics |
| `pnpm exec next build` | 1 | Six existing Google Fonts downloads failed, as allowed by the brief. No other build errors were reported. |

The build's final error list contains only `next/font` failures for Geist Mono, Inter, Jost, Manrope, Source Serif 4 and Work Sans, followed by `at ignore-listed frames`. It did not reach deployment tracing or page collection, so the deployed font bundle has not been inspected. The PDF fonts are local and every PDF render succeeded without downloading fonts.

Logs: `tmp/billing-samples/check-pdf.log`, `render-samples.log`, `totals.log`, `typecheck.log`, `eslint.log`, `build.log`.

Additional checks cover Nairobi date conversion, decimal quantities, ordered sections, VAT formatting, receipt invoice/status/paid date, missing profiles and linked invoices, private-template denial, unknown templates, all font families and contrast on gold/dark fills. Logo checks use mocked responses and local files, including unsupported schemes/MIME, traversal, invalid signatures, redirects, declared and streamed oversize responses, exceptions and the actual five-second abort. The escaped tracing glob was checked with Next's own picomatch and matches `/api/billing/[id]/pdf`.

PowerShell formats pnpm's `$ tsc --noEmit` stderr echo as a `NativeCommandError` record in the typecheck log. The command returned zero and TypeScript emitted no diagnostics.

## Samples

All files below are in gitignored `tmp/billing-samples/`. Sizes are bytes. The invoice sample has no logo. Other samples use the existing local `public/brand/energy4impact.png` as a fixture, not as the owner's artwork.

| Template | Quote | Invoice | Receipt | Invoice with 25 items |
| --- | --- | --- | --- | --- |
| classic | `classic-quote.pdf` 47334 | `classic-invoice.pdf` 18972 | `classic-receipt.pdf` 47852 | `classic-invoice-long.pdf` 52808 |
| minimal | `minimal-quote.pdf` 51460 | `minimal-invoice.pdf` 23324 | `minimal-receipt.pdf` 52416 | `minimal-invoice-long.pdf` 57610 |
| bold | `bold-quote.pdf` 51042 | `bold-invoice.pdf` 22614 | `bold-receipt.pdf` 51421 | `bold-invoice-long.pdf` 57765 |
| astro | `astro-quote.pdf` 54070 | `astro-invoice.pdf` 26762 | `astro-receipt.pdf` 57538 | `astro-invoice-long.pdf` 61142 |

The 25-item invoices have 4 pages for classic, minimal and astro, and 5 for bold. The four-item samples have 2 pages. Every item row or card is kept together. These are deliberately content-rich fixtures with long descriptions, contact details, bank/M-Pesa details, terms and notes.

Rendered all 41 sample pages with PyMuPDF and inspected the contact sheet and individual pages. Checked page-number text and text bounds on every page. The final Astro footer uses three contact columns at the reference's scaled type size. PNGs, the contact sheet and the temporary review script are beside the PDFs. Claude's separate comparison with the Figma references and signed-in audit are still required.

## Git and omissions

All Git commands, in order (including the final read-only checks):

```powershell
git status --short
git log -3 --oneline
git branch --show-current
git status --short
git diff --stat
git diff -- next.config.ts src/components/billing/profile-form.tsx src/components/billing/document-form.tsx 'src/app/dashboard/billing/[id]/page.tsx'
git diff --check
git status --short
git diff --no-ext-diff --unified=0 > tmp/billing-samples/changes.diff
git add -- .gitignore STATE.md next.config.ts scripts/check-billing-pdf.ts scripts/lib/billing-pdf-samples.ts scripts/render-billing-samples.tsx 'src/app/api/billing/[id]/pdf/route.ts' 'src/app/dashboard/billing/[id]/page.tsx' src/components/billing/document-form.tsx src/components/billing/profile-form.tsx src/components/billing/template-swatches.tsx src/lib/billing/pdf .claude/notes/billing-q2-validation.md
git diff --check
git status --short
git diff --no-ext-diff --unified=0 > tmp/billing-samples/changes.diff
```

The add command returned `fatal: Unable to create 'C:/Users/ether/Documents/NikoForm-q1/.git/index.lock': Permission denied`. No commit was attempted because staging could not start. All changes remain uncommitted. No push, fetch, pull, merge, rebase, reset, branch change, tag or remote mutation was run. The final diff whitespace and banned-character checks pass.

No database calls, migrations, signed-in browser tests or production tests were run. This clone has dummy environment values, and the brief assigns the signed-in and ownership audit to Claude. No OpenCode job was launched: the current instruction explicitly assigns this approved implementation to Codex. OpenCode cost: zero.
