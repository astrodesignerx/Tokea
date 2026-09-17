import { fetchLogoBytes } from "@/lib/cards/qr";
import { layoutQr, layoutToSvg, type QrDesign } from "./design";
import { buildQrPdf, type PdfLogo } from "./pdf";

/**
 * Server-side downloads for styled QR codes. The logo is fetched once and
 * embedded, so the files work offline and in print software.
 */

type Logo = { bytes: Buffer; mime: string } | null;

export async function loadLogo(url: string | null): Promise<Logo> {
  return url ? fetchLogoBytes(url) : null;
}

export async function styledQrSvg(
  text: string,
  design: QrDesign,
  logoUrl: string | null,
  pixelWidth = 1024
): Promise<string> {
  const logo = await loadLogo(logoUrl);
  const layout = layoutQr(text, { ...design, hasLogo: Boolean(logo) });
  const href = logo ? `data:${logo.mime};base64,${logo.bytes.toString("base64")}` : null;
  return layoutToSvg(layout, { logoHref: href, pixelWidth });
}

/**
 * Server PDF. The server has no way to turn SVG or WebP into pixels without a
 * native library, so those logos are left out here; the dashboard builds its
 * PDFs in the browser instead, where they are included.
 */
export async function styledQrPdf(
  text: string,
  design: QrDesign,
  logoUrl: string | null,
  size = 512
): Promise<Buffer> {
  const raw = await loadLogo(logoUrl);
  const kind: PdfLogo["kind"] | null =
    raw?.mime === "image/png" ? "png" : raw?.mime === "image/jpeg" ? "jpg" : null;
  const logo = raw && kind ? { bytes: new Uint8Array(raw.bytes), kind } : null;
  const layout = layoutQr(text, { ...design, hasLogo: Boolean(logo) });
  return Buffer.from(await buildQrPdf(layout, logo, size));
}
