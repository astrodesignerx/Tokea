DONE: Only 3A implemented, uncommitted on `ds/checklists-3a`. No branch switch, commit or push.

CHANGED:

- `prisma/schema.prisma`: repeat fields, sub-task and event relations.
- `src/lib/checklists/*`, `src/lib/actions/checklists.ts`: period maths, locked resets, nesting rules and prep-list creation.
- `src/components/checklists/*`: settings, progress, counted deletion confirmation and motion.
- Checklist and event detail pages: repeat badges, prep panel and event backlink.
- Cron route and `scripts/check-checklists.ts`: resets before emails and expanded offline checks.

MIGRATION: [20261103120000_checklists_phase3/migration.sql](/C:/Users/ether/Documents/NikoForm-3a/prisma/migrations/20261103120000_checklists_phase3/migration.sql), not applied.

CHECKS: PASS Prisma validation, typecheck, eslint (0 problems), both check scripts (“all passed”), whitespace and scope checks against `ds/ui-consistency`. BUILD BLOCKED: Google Fonts DNS failures (`ENOTFOUND`); retries stopped, full build unverified.

NOTES: `BRIEF.md` and `.env.local` untouched. No database or browser testing. Assumptions: archived lists pause resets; changed schedules first reset next period; reordering stays within siblings; event backlinks are owner-only.