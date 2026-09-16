import { fetchLogoBytes } from "@/lib/cards/qr";
import { layoutQr, layoutToSvg, type QrDesign, type QrLayout } from "./design";

/**
 * Server-side downloads for styled QR codes. The logo is fetched once and
 * embedded, so the files work offline and in print software.
 */

type Logo = { bytes: Buffer; mime: string } | null;

async function loadLogo(url: string | null): Promise<Logo> {
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

function hexToRgb(hex: string) {
  const clean = hex.replace(/^#/, "");
  const value = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : "000000";
  return {
    red: parseInt(value.slice(0, 2), 16) / 255,
    green: parseInt(value.slice(2, 4), 16) / 255,
    blue: parseInt(value.slice(4, 6), 16) / 255,
  };
}

/** Standard PDF fonts only cover Latin-1, so anything else is dropped. */
function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

/**
 * Vector PDF, `size` points wide. Shapes are drawn as paths, so the file
 * scales cleanly for print. SVG logos cannot be embedded by pdf-lib and are
 * left out; PNG and JPEG logos are drawn on their plate.
 */
export async function styledQrPdf(
  text: string,
  design: QrDesign,
  logoUrl: string | null,
  size = 512
): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const rawLogo = await loadLogo(logoUrl);
  const logo = rawLogo && rawLogo.mime !== "image/svg+xml" ? rawLogo : null;
  const layout: QrLayout = layoutQr(text, { ...design, hasLogo: Boolean(logo) });

  const scale = size / layout.width;
  const pageHeight = layout.height * scale;
  const doc = await PDFDocument.create();
  const page = doc.addPage([size, pageHeight]);
  // drawSvgPath flips the y axis, so the origin is the page's top-left corner.
  const at = { x: 0, y: pageHeight, scale };
  const colour = (hex: string) => {
    const c = hexToRgb(hex);
    return rgb(c.red, c.green, c.blue);
  };

  if (layout.backgroundPath) {
    page.drawSvgPath(layout.backgroundPath, { ...at, color: rgb(1, 1, 1) });
  }
  for (const part of layout.parts) {
    if (part.d) page.drawSvgPath(part.d, { ...at, color: colour(part.fill) });
  }

  if (layout.logo && logo) {
    try {
      page.drawSvgPath(layout.logo.plate, { ...at, color: rgb(1, 1, 1) });
      const image =
        logo.mime === "image/jpeg" ? await doc.embedJpg(logo.bytes) : await doc.embedPng(logo.bytes);
      const box = layout.logo.size * scale;
      const fit = Math.min(box / image.width, box / image.height);
      const w = image.width * fit;
      const h = image.height * fit;
      const left = layout.logo.x * scale + (box - w) / 2;
      const top = layout.logo.y * scale + (box - h) / 2;
      page.drawImage(image, { x: left, y: pageHeight - top - h, width: w, height: h });
    } catch {
      // A logo that cannot be embedded must never break the download.
    }
  }

  if (layout.frame) {
    const label = pdfSafe(layout.frame.text);
    if (label) {
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = layout.frame.fontSize * scale;
      const width = font.widthOfTextAtSize(label, fontSize);
      // Helvetica capitals are about 0.72em tall; centre them on the band.
      const halfCap = fontSize * 0.36;
      page.drawText(label, {
        x: layout.frame.textX * scale - width / 2,
        y: pageHeight - layout.frame.textY * scale - halfCap,
        size: fontSize,
        font,
        color: rgb(1, 1, 1),
      });
    }
  }

  return Buffer.from(await doc.save());
}
