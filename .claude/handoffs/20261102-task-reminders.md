# Task: Morning email of checklist tasks due today or overdue (phase 3a)
Project: C:\Users\ether\Documents\NikoForm. Stack: Next.js 16 App Router, React 19, Tailwind v4, Prisma 7 on Postgres (Supabase), zod 3, pnpm, Resend email, Vercel cron. Read STATE.md first; Checklists (`src/lib/checklists/`) is live and this builds on it.

## Goal
Each morning at 07:00 Nairobi time, everyone with checklist tasks due today or overdue gets one short email listing them, with a link back to My tasks. People can switch it off. Nobody gets more than one a day, and nobody with nothing due gets anything.

## DANGER: live database
`.env.local` points at the PRODUCTION database. Never run anything that connects to it: no `prisma migrate dev|deploy|reset|resolve|status`, `prisma db push|pull|execute|seed`, `prisma studio`, `pnpm db:*`, `pnpm dev`, `pnpm start`, `next dev`, `next start`, and no scripts that import `src/lib/db.ts`. `prisma generate`, `prisma validate`, `prisma format` and `next build` are fine. Claude applies the migration after review.

## Data model
Add to `User` in `prisma/schema.prisma`:
```prisma
  // Morning email of checklist tasks due today or overdue. On by default.
  task_reminders         Boolean   @default(true)
  // Nairobi date of the last reminder email, so a re-run the same day sends nothing.
  task_reminder_sent_on  DateTime? @db.Date
```
Migration `prisma/migrations/20261102120000_task_reminders/migration.sql`: only `ALTER TABLE "User" ADD COLUMN ...` for these two columns (the boolean with `NOT NULL DEFAULT true`). Nothing else.

## Files
- `src/lib/checklists/data.ts`: export the existing `myTasksWhere(userId)` (unchanged) so the reminder uses exactly the My tasks rules.
- `src/lib/checklists/reminders.ts` (pure, no DB): `nairobiToday(now)` returning a `YYYY-MM-DD` string, and `pickDueTasks(tasks, now)` that keeps tasks whose `dueState` is `overdue` or `today`, sorted overdue first, then by due date, then list title, capped at 20, plus the total count.
- `src/lib/emails.ts`: `taskReminderEmail({ name, overdue, today, more, myTasksUrl, settingsUrl })` with the existing `layout`, `row` and `button` helpers. Subject: "3 tasks due today" or "2 overdue, 1 due today" (correct singular and plural). Each task line: title, list title, due date for overdue ones. Footer: "Turn these emails off" linking to `settingsUrl`.
- `src/app/api/cron/task-reminders/route.ts`: GET, same `CRON_SECRET` bearer check as `src/app/api/cron/reminders/route.ts`. Find users with `task_reminders = true` and `task_reminder_sent_on` not today (Nairobi) who have at least one open task matching `myTasksWhere` with `due_on` on or before today. Process in pages of 100 users. For each: build the list with `pickDueTasks`, send with `sendEmail`, and only after a successful send set `task_reminder_sent_on` to today. One user failing must not stop the others; log and continue. Respond with `{ users, sent, skipped, failed }`. Links use `getCardsOrigin()`.
- `vercel.json`: add `{ "path": "/api/cron/task-reminders", "schedule": "0 4 * * *" }` (04:00 UTC is 07:00 Nairobi). Keep the existing reminders cron unchanged.
- `src/lib/actions/checklists.ts`: `setTaskRemindersAction(form)` that sets `task_reminders` for the signed-in user only (`requireUser()`), returning the usual state shape.
- `src/app/dashboard/checklists/page.tsx` (My tasks view): a small "Morning email" switch with one line of help ("Tasks due today or overdue, at 7am"), using that action. If the URL has `?settings=reminders`, scroll it into view and highlight it briefly with the existing `qr-fade` class.
- `scripts/check-checklists.ts`: add checks for `nairobiToday` around 20:59 and 21:01 UTC, and for `pickDueTasks` ordering, the 20 cap and the count.

## Acceptance (run all, all must pass)
- `pnpm exec prisma validate`
- `pnpm typecheck`
- `pnpm exec eslint src scripts` reports 0 problems
- `pnpm exec tsx scripts/check-checklists.ts` prints `checklists checks: all passed`
- `pnpm exec tsx scripts/check-forms.ts` prints `forms checks: all passed`
- `pnpm exec next build` succeeds
- The migration only adds the two `User` columns
- `git diff master --stat` touches only the files listed above
- No em dash, en dash, middle dot or bullet character in any changed file

## Hard rules
- Stay in scope; use `.scratch/` for experiments and never commit it. Do not add dependencies.
- The email never includes tasks from lists the person is not a member of, and never anyone else's email address.
- Match surrounding code style: comments explain why, sentence-case copy. No em dashes, en dashes or middle dots anywhere.
- If something is ambiguous, pick the simplest option consistent with the brief and note it.

## Report (final message)
DONE: yes/no | CHANGED: <path>: <one line each> | CHECKS: <command>: pass/fail | BLOCKED: <denied commands> | NOTES: <assumptions, skipped items>
