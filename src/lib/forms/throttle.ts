/**
 * Submission limit per form and client, kept in memory. On serverless this is
 * per instance, so it slows repeated posts rather than stopping them outright.
 * A shared store (database or Redis) can replace this if abuse shows up.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 10;

const submissions = new Map<string, { count: number; resetAt: number }>();

function key(formId: string, ip: string): string {
  return `${formId}:${ip}`;
}

/** Drops expired entries once the map has grown enough to be worth a sweep. */
function sweep(now: number) {
  if (submissions.size < 1000) return;
  for (const [entryKey, record] of submissions) {
    if (record.resetAt <= now) submissions.delete(entryKey);
  }
}

/**
 * True when this client may send another answer for this form. Counts every
 * accepted submission, including ones that later fail validation, so a script
 * cannot retry its way past the limit.
 */
export function allowFormSubmission(formId: string, ip: string, now = Date.now()): boolean {
  const entryKey = key(formId, ip);
  const record = submissions.get(entryKey);

  if (!record || record.resetAt <= now) {
    sweep(now);
    submissions.set(entryKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_SUBMISSIONS) return false;

  record.count += 1;
  return true;
}
