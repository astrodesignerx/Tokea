# To-do implementation checks

Date: 2026-11-03. Checkout: ds-redesign-r1. Branch: ds/todo. Implementation base: 4fd7ef7.

## Acceptance

- `pnpm.cmd typecheck`: last output `$ tsc --noEmit`, followed by `TYPECHECK_EXIT=0`.
- `pnpm.cmd exec eslint src scripts`: no diagnostics, `ESLINT_EXIT=0`.
- `pnpm.cmd exec next build`: compiled successfully in 15.1s, TypeScript finished in 29.2s, all 27 static pages generated, final output `(Dynamic) server-rendered on demand`, `BUILD_EXIT=0`.
- `pnpm.cmd exec tsx scripts/check-forms.ts`: final output `forms checks: all passed`, `FORMS_EXIT=0`. Includes existing field types and new To-do configuration, quantity, total, posted-input, CSV and frozen-version cases.
- Final `git diff --stat 4fd7ef7` after staging: `14 files changed, 658 insertions(+), 22 deletions(-)`. Protected-path check: `Protected paths: []`. UTF-8 byte-safe banned-character check on the complete base diff: `[]`. `git diff --check`: no diagnostics.

## Scope and implementation

- No schema, API, template, theme, redirect, QR or card changes. No dependencies added or upgraded.
- Submission flow verified by source inspection: it validates `readAnswers` against the frozen version, stores the resulting quantity record unchanged, and never reads a browser-supplied total. To-do values are not added to notification email content.
- Owner totals and CSV totals use `todoTotal` against each response's frozen version. Historical service picks remain in summary counts even after service removal.
- Checklist conversion checks form ownership and serialises exact-title lookup and creation under the existing owner row lock. It creates owner membership, service tasks and notes, with existing active-list and item limits.
- Individual responses are expanded with View response in the Responses table. Turn into checklist appears only when valid service picks exist.
- The brief's banned-character example used literal banned characters. Replaced only those literals with ASCII Unicode escapes, preserving the check and the feature spec.

## Failures, warnings and deferred checks

- Initial plain `pnpm` invocations were blocked by PowerShell execution policy for `pnpm.ps1`. Equivalent `pnpm.cmd` commands all pass without changing policy.
- Build emits the existing multiple-lockfile workspace-root warning. No configuration or fonts changed; font fetching succeeded.
- Initial apply_patch shell transport attempts failed before applying edits. Direct invocation of its bundled executable through Node resolved the Windows argument transport issue.
- No live database access, upload, browser or signed-in checks performed. The brief assigns the signed-in light/dark and phone/desktop audit, upload verification, checklist creation/reuse and cleanup to the separate post-build review.
- No Prisma commands, forbidden Git operations, remote changes, push, merge or publication performed.
