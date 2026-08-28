/**
 * How long a magic sign-in link stays valid.
 *
 * Auth.js defaults to 24 hours, which is a long window for what is effectively
 * a bearer credential sitting in an inbox. 15 minutes matches the intent the
 * original UI copy described and is comfortably longer than delivery takes.
 *
 * Safe to import from client components — no server-only dependencies. The
 * sign-in UI derives its wording from the same constant the provider is
 * configured with, so the two cannot disagree.
 */
export const SIGN_IN_LINK_MAX_AGE_SECONDS = 15 * 60;

export function signInLinkExpiryLabel(): string {
  const minutes = Math.round(SIGN_IN_LINK_MAX_AGE_SECONDS / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}
