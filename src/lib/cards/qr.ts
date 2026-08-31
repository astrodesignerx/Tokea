import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

/**
 * Card QR codes, kept separate from src/lib/qr.ts (event check-in codes): these
 * are brand-coloured and use error correction level H so a logo can be dropped
 * into the centre for print without breaking the scan. The organisation logo is
 * composited onto a white rounded plate in the middle, contain-fit so both
 * landscape and portrait logos sit undistorted.
 *
 * sharp is loaded lazily and defensively: if its native binary is missing from
 * a deployment's bundle, QR codes fall back to unbranded rather than taking the
 * route down with a module-load error.
 */

const BRAND_DARK = "#464F58";

type SharpModule = typeof import("sharp");
let sharpModule: SharpModule | null | undefined;

async function loadSharp(): Promise<SharpModule | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = await import("sharp");
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

export type CardQrLogo = Buffer | null;

// Logos are refetched on every page render otherwise; this keeps that cheap. A
// short TTL means a replaced logo shows up without a deploy.
const LOGO_CACHE_TTL_MS = 10 * 60 * 1000;
const logoCache = new Map<string, { bytes: Buffer; expires: number }>();

/**
 * Loads an organisation logo as PNG/SVG bytes. Handles both local public assets
 * ("/brand/energy4impact.png") and absolute URLs, with a short in-memory cache.
 * Returns null on any failure so the caller can fall back to a plain QR.
 */
export async function fetchLogoBytes(
  url: string | null | undefined
): Promise<Buffer | null> {
  if (!url) return null;

  const cached = logoCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.bytes;

  try {
    let bytes: Buffer | null = null;

    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url);
      if (existsSync(filePath) && readFileSync(filePath).length > 0) {
        bytes = readFileSync(filePath);
      }
    } else {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
    }

    if (!bytes) return null;
    logoCache.set(url, { bytes, expires: Date.now() + LOGO_CACHE_TTL_MS });
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Darkens a hex colour until it has safe contrast against white, so a brand
 * colour that is too light (like Energy 4 Impact's teal) can be used for QR
 * modules without hurting scan reliability. Returns the neutral dark as a
 * fallback for anything unparseable.
 */
export function ensureScannableDark(hex: string): string {
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return BRAND_DARK;

  let [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));

  const luminance = ([r, g, b]: number[]) => {
    const f = (c: number) =>
      (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a: number, b: number) =>
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  // 4.5:1 vs white is comfortably above what QR needs for reliable scanning.
  while (contrast(1, luminance([r, g, b])) < 4.5 && (r || g || b)) {
    r = Math.round(r * 0.88);
    g = Math.round(g * 0.88);
    b = Math.round(b * 0.88);
  }

  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Hotfix: branded QR compositing is disabled to restore the live site.
 *  The previous sharp-based implementation is kept behind the lazy loader
 *  but bypassed here so /c/[slug] and /api/cards/[slug]/qr never depend on
 *  a native binary. Re-enable by restoring the body of this function. */
async function withLogo(qr: Buffer, _width: number, _logo: Buffer): Promise<Buffer> {
  return qr;
}

export async function cardQrPng(
  url: string,
  options: { width?: number; dark?: string; logo?: CardQrLogo } = {}
): Promise<Buffer> {
  const width = options.width ?? 1024;
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: options.dark ?? BRAND_DARK, light: "#FFFFFF" },
  });
  return options.logo ? withLogo(png, width, options.logo) : png;
}

export async function cardQrDataUrl(
  url: string,
  options: { width?: number; dark?: string; logo?: CardQrLogo } = {}
): Promise<string> {
  const width = options.width ?? 320;
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: options.dark ?? BRAND_DARK, light: "#FFFFFF" },
  });
  const final = options.logo ? await withLogo(png, width, options.logo) : png;
  return `data:image/png;base64,${final.toString("base64")}`;
}
