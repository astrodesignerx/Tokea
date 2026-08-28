import { headers } from "next/headers";

/**
 * The public origin cards are served from. Vercel injects
 * VERCEL_PROJECT_PRODUCTION_URL for the stable production hostname; falling
 * back to the request host keeps preview deployments and localhost generating
 * QR codes that actually resolve.
 *
 * Set NEXT_PUBLIC_CARDS_URL once a real domain exists. The short-link
 * indirection below survives a changed path, but nothing survives a changed
 * domain, so pin this before anything goes to print.
 */
export async function getCardsOrigin(): Promise<string> {
  const configured =
    process.env.NEXT_PUBLIC_CARDS_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3012";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
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
