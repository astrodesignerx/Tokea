/**
 * Development-only holding area for magic links that could not be emailed.
 *
 * A sign-in link is a bearer credential: anyone holding it becomes that user.
 * Nothing here may ever run in production, so every entry point checks
 * NODE_ENV, the value is handed out at most once, and it expires on its own.
 *
 * Server-side only. Never import this from a client component.
 */
const links = new Map<string, { url: string; storedAt: number }>();

const TTL_MS = 15 * 60 * 1000;

function isEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function rememberDevSignInLink(email: string, url: string): void {
  if (!isEnabled()) return;
  links.set(email.trim().toLowerCase(), { url, storedAt: Date.now() });
}

/** Returns the pending link for `email` and forgets it. Null if none or stale. */
export function takeDevSignInLink(email: string): string | null {
  if (!isEnabled()) return null;
  const key = email.trim().toLowerCase();
  const hit = links.get(key);
  if (!hit) return null;
  // Read once: a link left sitting in memory is a credential left lying around.
  links.delete(key);
  if (Date.now() - hit.storedAt > TTL_MS) return null;
  return hit.url;
}
