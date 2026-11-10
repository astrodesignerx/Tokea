# To-do list Responses tab

Implemented on `ds/todo-responses`, based on fetched `origin/master` at `9e7024c54d6ddd2d97b46d304b1bc88737f6ef00`.

The Responses page shows non-archived item tallies, quantities and additional-needs counts, followed by the inbox-style submissions table with received dates, status filters and 50-row pagination. Shared Edit/Responses links show the non-archived request count and an unread indicator. Request details, schema, migrations and the lockfile are unchanged.

## Checks

| Command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` | PASS. Dependencies were missing; lockfile unchanged. |
| `pnpm.cmd exec prisma generate` | PASS. Local client generation only, no database connection. |
| `pnpm.cmd typecheck` | PASS. Repeated after fixture removal. |
| `pnpm.cmd exec eslint src scripts` | PASS. |
| `pnpm.cmd exec tsx scripts/check-todo.ts` | PASS. Includes empty tallies, current item names, deleted-item names, distinct-request counts, quantity totals, same-name items with different IDs, and sorting. |
| `pnpm.cmd exec next build` | PASS after clearing stale generated dev-route types. See `build.log`. |
| `git diff --check` | PASS. |

The first build failed because `.next/dev/types/validator.ts` still referenced the removed fixture route: `Type '"/dev/todo-response-fixture"' is not assignable to type 'LayoutRoutes'.` Only the three generated files in this worktree's `.next/dev/types` were removed to fix it. The initial diagnostic is preserved in `build-first-attempt.log`.

Next.js warns that multiple lockfiles cause it to infer `C:/Users/ether` as the workspace root. No configuration changes were made. The development server also reported `There is not enough space on the disk. (os error 112)` while persisting its cache. Free space was available again when the final build ran; no unrelated files or caches were deleted.

## Fixture browser evidence

The temporary development route used source copies of the actual Responses page, editor page, tabs and response-count helper. Only database/auth imports and internal fixture navigation URLs were substituted. The fixture used an in-memory owner and requests, with assertions rejecting any new request query missing its list ID and owner scope. It included 55 submissions, 11 archived, 44 non-archived, 15 additional-needs responses and long item names. A separate fixture shell used the app theme control. No live database, mailbox, storage or user account was accessed.

Playwright checks passed at both 375 px and 1440 px in light and dark:

- Page scroll width equalled the viewport width. The table scrolled within its own focusable region at 375 px, including with the keyboard.
- Both tabs navigated and set `aria-current="page"` correctly. Counts and unread indicators appeared on both pages.
- Keyboard focus was visible. Enter activated the New filter, returning 11 rows with six unread rows in bold.
- Every status filter returned the expected 11 rows. Archived submissions appeared only in the table, with the all-time non-archived tally unchanged.
- Pagination returned 50 rows followed by five rows. Received dates, event dates, item counts, estimates and detail-link destinations were checked.
- Empty, notes-only and no-estimate fixtures rendered correctly. A different owner's list ID returned HTTP 404 before response queries ran.
- Emulated reduced motion produced `animation-name: none` and the final bar scale immediately. The first bar was `scaleX(0.75)`, matching 33 of 44 requests.
- No browser page errors occurred in the four theme/viewport runs. Machine-readable results are in `browser-checks.json`.

The shared preview tool intermittently timed out or hid finished animations during screenshot capture. Local Playwright provided the final unmodified screenshots, all visually inspected:

| Viewport | Theme | Screenshot |
| --- | --- | --- |
| 375 by 1000 | Light | `375-light.png` |
| 375 by 1000 | Dark | `375-dark.png` |
| 1440 by 1000 | Light | `1440-light.png` |
| 1440 by 1000 | Dark | `1440-dark.png` |

## Scope and limitations

All new list reads use `owner_id: user.id`; new request reads and counts include `list: { owner_id: user.id }`. Item tallies inherit that constraint through `request`. The fixture checks query scoping and the 404 branch, but real authentication, PostgreSQL execution and live data remain unverified by design.

The temporary fixture routes, mock modules, browser harness and dummy `.env.local` were removed before commit. No push, merge, PR, deployment, schema change or migration was performed. No OpenCode delegation was used.

## Changed files

- `src/app/dashboard/todo/[id]/responses/page.tsx`: owner-scoped read-only Responses page.
- `src/app/dashboard/todo/[id]/page.tsx`: shared tabs and counts on the existing editor page.
- `src/components/todo/todo-list-tabs.tsx`: accessible shared navigation and unread indicator.
- `src/lib/todo/data.ts`: owner-scoped counts shared by both pages.
- `src/lib/todo/logic.ts`: distinct-request item grouping and sorting.
- `src/app/globals.css`: composited tally animation, pill interaction transitions and reduced-motion rules.
- `scripts/check-todo.ts`: response tally regression cases.
- `STATE.md`: branch status and evidence pointer.
- `.claude/artifacts/todo-responses/report.md`: this implementation and validation report.
- `.claude/artifacts/todo-responses/browser-checks.json`: fixture browser results.
- `.claude/artifacts/todo-responses/build.log`: successful production build output.
- `.claude/artifacts/todo-responses/build-first-attempt.log`: stale fixture-type failure output.
- `.claude/artifacts/todo-responses/375-light.png`: mobile light screenshot.
- `.claude/artifacts/todo-responses/375-dark.png`: mobile dark screenshot.
- `.claude/artifacts/todo-responses/1440-light.png`: desktop light screenshot.
- `.claude/artifacts/todo-responses/1440-dark.png`: desktop dark screenshot.
