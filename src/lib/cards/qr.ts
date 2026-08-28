import QRCode from "qrcode";

/**
 * Card QR codes, kept separate from src/lib/qr.ts (event check-in codes): these
 * are brand-coloured and use error correction level H so a logo can be dropped
 * into the centre for print without breaking the scan.
 */

const BRAND_DARK = "#464F58";

export async function cardQrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: BRAND_DARK, light: "#FFFFFF" },
  });
}

export async function cardQrDataUrl(url: string, width = 320): Promise<string> {
  return QRCode.toDataURL(url, {
    width,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: BRAND_DARK, light: "#FFFFFF" },
  });
}
