/**
 * Pure helpers for dynamic QR codes. No Node or database imports, so the
 * dashboard form can reuse the same validation in the browser.
 */

export const QR_INDEX_PATH = "/q";

export const QR_STATUSES = ["active", "paused", "archived"] as const;
export type QrStatus = (typeof QR_STATUSES)[number];

const MAX_URL_LENGTH = 2000;

/** Permanent address a QR code encodes. */
export function qrPath(shortCode: string): string {
  return `${QR_INDEX_PATH}/${shortCode}`;
}

/**
 * Returns the cleaned URL, or null when it is not a safe redirect target.
 *
 * Only absolute http(s) addresses are accepted: a stored `javascript:` or
 * `data:` URL would turn every scan into an attack on whoever scanned it.
 * A bare domain like "example.com" is treated as https, since that is what
 * people type.
 */
export function normaliseDestination(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;

  return url.toString();
}

export type UtmTags = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

/**
 * Adds campaign tags to a destination at redirect time. A tag the destination
 * already carries is left alone, so a hand-built link is never overwritten.
 */
export function withUtm(destination: string, tags: UtmTags): string {
  const url = new URL(destination);
  for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const value = tags[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Only a 6-digit hex reaches the database, since it ends up inside SVG markup. */
export function normaliseColour(input: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(input.trim()) ? input.trim().toUpperCase() : fallback;
}

/**
 * Logos are fetched by the server when a download is rendered, so only https
 * URLs and files under /public are allowed.
 */
export function normaliseLogoUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type QrDevice = "ios" | "android" | "other";

/** Coarse platform from a user agent. iPadOS reports as Mac, so that counts as other. */
export function detectDevice(userAgent: string | null): QrDevice {
  if (!userAgent) return "other";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

type Routable = {
  destination: string;
  ios_destination: string | null;
  android_destination: string | null;
  expires_at: Date | null;
  expired_destination: string | null;
};

export function isExpired(code: Pick<Routable, "expires_at">, now = new Date()): boolean {
  return code.expires_at !== null && code.expires_at.getTime() <= now.getTime();
}

/**
 * Where a scan should go, before campaign tags. Returns null when the code has
 * expired with no follow-up link, meaning "send them to the /q page".
 */
export function pickDestination(code: Routable, device: QrDevice, now = new Date()): string | null {
  if (isExpired(code, now)) return code.expired_destination;
  if (device === "ios" && code.ios_destination) return code.ios_destination;
  if (device === "android" && code.android_destination) return code.android_destination;
  return code.destination;
}
