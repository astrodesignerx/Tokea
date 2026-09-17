import type { QrLayout } from "./design";

/**
 * Vector PDF for a laid-out QR code. Runs on the server and in the browser
 * (pdf-lib is plain JavaScript), so the dashboard can build PDFs with logos
 * the server cannot embed.
 *
 * pdf-lib only embeds PNG and JPEG. Callers turn anything else, SVG logos
 * included, into PNG first.
 */

export type PdfLogo = { bytes: Uint8Array; kind: "png" | "jpg" };

function hexToRgb(hex: string) {
  const clean = hex.replace(/^#/, "");
  const value = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : "000000";
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Standard PDF fonts only cover Latin-1, so anything else is dropped. */
function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

/**
 * `layout` must have been made with hasLogo matching whether `logo` is given,
 * so the plate and the gap in the dots line up with the image.
 */
export async function buildQrPdf(
  layout: QrLayout,
  logo: PdfLogo | null,
  size = 512
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const scale = size / layout.width;
  const pageHeight = layout.height * scale;
  const doc = await PDFDocument.create();
  const page = doc.addPage([size, pageHeight]);
  // drawSvgPath flips the y axis, so the origin is the page's top-left corner.
  const at = { x: 0, y: pageHeight, scale };
  const colour = (hex: string) => rgb(...hexToRgb(hex));

  if (layout.backgroundPath) {
    page.drawSvgPath(layout.backgroundPath, { ...at, color: rgb(1, 1, 1) });
  }
  for (const part of layout.parts) {
    if (part.d) page.drawSvgPath(part.d, { ...at, color: colour(part.fill) });
  }

  if (layout.logo && logo) {
    try {
      page.drawSvgPath(layout.logo.plate, { ...at, color: rgb(1, 1, 1) });
      const image = logo.kind === "jpg" ? await doc.embedJpg(logo.bytes) : await doc.embedPng(logo.bytes);
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

  return doc.save();
}
