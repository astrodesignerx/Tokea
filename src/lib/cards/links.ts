import { headers } from "next/headers";

/**
 * The public origin cards are served from — the origin every QR code encodes.
 *
 * Deliberately reads no NEXT_PUBLIC_ variable. Next inlines those into the
 * bundle at build time, so a stale one cannot be corrected by editing the
 * environment: it takes a rebuild, and until then every generated QR code
 * carries the old value. A deployment shipped with NEXT_PUBLIC_APP_URL still
 * set to http://localhost:3012, and every short link pointed at the
 * developer's laptop. An origin is a runtime fact and is resolved as one here.
 *
 * Order, most specific first:
 *   CARDS_URL                     an explicit custom domain, read at runtime
 *   VERCEL_PROJECT_PRODUCTION_URL Vercel's stable production hostname
 *   the request host              correct by construction, covers localhost
 *
 * The short-link indirection survives a changed path, but nothing survives a
 * changed domain, so set CARDS_URL before anything goes to print.
 */
export async function getCardsOrigin(): Promise<string> {
  const explicit = process.env.CARDS_URL;
  if (explicit) return normalise(explicit);

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return normalise(production);

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3012";
  return normalise(host);
}

/** Accepts a bare hostname or a full URL, and returns an origin without a trailing slash. */
function normalise(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const local = trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${trimmed}`;
}

export const CARDS_INDEX_PATH = "/c";

/** Canonical page for a card. Changes if the person's slug changes. */
export function cardPath(slug: string): string {
  return `/c/${slug}`;
}

/** Permanent address for a card. This is what QR codes and NFC tags encode. */
export function shortPath(shortCode: string): string {
  return `/s/${shortCode}`;
}

export async function shortUrl(shortCode: string): Promise<string> {
  return `${await getCardsOrigin()}${shortPath(shortCode)}`;
}

export async function cardUrl(slug: string): Promise<string> {
  return `${await getCardsOrigin()}${cardPath(slug)}`;
}
