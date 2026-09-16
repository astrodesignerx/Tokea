/**
 * QR colour rules, kept free of Node imports so the dashboard's live preview can
 * use exactly the same darkening as the server-rendered downloads.
 */

export const BRAND_DARK = "#464F58";

/**
 * Darkens a colour until it has at least 4.5:1 contrast against white, so a
 * pale brand colour still scans. Anything that is not a 6-digit hex falls back
 * to the default ink.
 */
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
