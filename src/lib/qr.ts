import QRCode from "qrcode";

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 400,
    color: { dark: "#111111", light: "#ffffff" },
  });
}
