// Per server instance, matching Forms. Counts invalid attempts as well.
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function allowTodoSubmission(listId: string, ip: string, now = Date.now()): boolean {
  const key = `${listId}:${ip}`;
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    if (attempts.size >= 1000) {
      for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
    }
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= 10) return false;
  record.count += 1;
  return true;
}
