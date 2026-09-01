import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

/**
 * Card QR codes, kept separate from src/lib/qr.ts (event check-in codes): these
 * are brand-coloured and use error correction level H so a logo can be dropped
 * into the centre for print without breaking the scan. The organisation logo is
 * composited as pure SVG (no native binary), contain-fit so both landscape and
 * portrait logos sit undistorted on a white rounded plate.
 */

const BRAND_DARK = "#464F58";

export type CardQrLogo = Buffer | null;

const LOGO_CACHE_TTL_MS = 10 * 60 * 1000;
const logoCache = new Map<string, { bytes: Buffer; mime: string; expires: number }>();

function mimeFromUrl(url: string, bytes?: Buffer): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes && bytes.toString("utf8", 0, 200).includes("<svg")) return "image/svg+xml";
  return "image/png";
}

export async function fetchLogoBytes(
  url: string | null | undefined
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!url) return null;
  const cached = logoCache.get(url);
  if (cached && cached.expires > Date.now()) return { bytes: cached.bytes, mime: cached.mime };
  try {
    let bytes: Buffer | null = null;
    let mime = mimeFromUrl(url);
    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      if (existsSync(filePath)) {
        bytes = readFileSync(filePath);
        mime = mimeFromUrl(url, bytes);
      }
    } else {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        bytes = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get("content-type");
        if (ct && ct.startsWith("image/")) mime = ct.split(";")[0];
        else mime = mimeFromUrl(url, bytes);
      }
    }
    if (!bytes) return null;
    logoCache.set(url, { bytes, mime, expires: Date.now() + LOGO_CACHE_TTL_MS });
    return { bytes, mime };
  } catch {
    return null;
  }
}

export function ensureScannableDark(hex: string): string {
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return BRAND_DARK;
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  const luminance = ([r, g, b]: number[]) => {
    const f = (c: number) => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  while (contrast(1, luminance([r, g, b])) < 4.5 && (r || g || b)) {
    r = Math.round(r * 0.88);
    g = Math.round(g * 0.88);
    b = Math.round(b * 0.88);
  }
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function svgWithLogo(svg: string, logo: { bytes: Buffer; mime: string }): Promise<string> {
  const viewBoxMatch = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const V = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 33;
  const box = V * 0.24;
  const radius = box * 0.18;
  const plateX = (V - box) / 2;
  const plateY = (V - box) / 2;
  const logoSize = box * 0.72;
  const logoX = (V - logoSize) / 2;
  const logoY = (V - logoSize) / 2;
  const dataUri = `data:${logo.mime};base64,${logo.bytes.toString("base64")}`;
  const inject =
    `<rect x="${plateX}" y="${plateY}" width="${box}" height="${box}" rx="${radius}" fill="#ffffff"/>` +
    `<image href="${dataUri}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace("</svg>", `${inject}</svg>`);
}

export async function cardQrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: BRAND_DARK, light: "#FFFFFF" },
  });
}

export async function cardQrDataUrl(
  url: string,
  options: { width?: number; dark?: string; logo?: { bytes: Buffer; mime: string } | null } = {}
): Promise<string> {
  const width = options.width ?? 320;
  const dark = options.dark ?? BRAND_DARK;
  if (options.logo) {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark, light: "#FFFFFF" },
    });
    const branded = await svgWithLogo(svg, options.logo);
    return `data:image/svg+xml;base64,${Buffer.from(branded).toString("base64")}`;
  }
  return QRCode.toDataURL(url, {
    width,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark, light: "#FFFFFF" },
  });
}
