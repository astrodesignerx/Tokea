import { auth } from "@/lib/auth";
import { getCardsOrigin } from "@/lib/cards/links";
import {
  cardQrPdf,
  cardQrPng,
  cardQrSvg,
  ensureScannableDark,
  fetchLogoBytes,
} from "@/lib/cards/qr";
import { findOwnedQrCode } from "@/lib/qr-codes/data";
import { qrPath } from "@/lib/qr-codes/links";

type RouteContext = { params: Promise<{ id: string }> };

const MIN_SIZE = 256;
const MAX_SIZE = 2048;
const DEFAULT_SIZE = 1024;

/**
 * Print downloads for a dynamic QR code. Owner-only, unlike the card route:
 * rendering fetches the code's logo URL server-side, and that should not be
 * something any visitor can trigger.
 *
 * Query params:
 *   ?format=png|svg|pdf  default png
 *   ?size=256..2048      raster size for PNG/PDF
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorised", { status: 401 });

  const { id } = await params;
  const qr = await findOwnedQrCode(session.user.id, id);
  if (!qr) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("size"));
  const size = Number.isFinite(requested) && requested > 0
    ? Math.min(Math.max(requested, MIN_SIZE), MAX_SIZE)
    : DEFAULT_SIZE;
  const format = (url.searchParams.get("format") ?? "png").toLowerCase();

  const target = `${await getCardsOrigin()}${qrPath(qr.short_code)}`;
  const dark = ensureScannableDark(qr.colour);
  const filename = `qr-${qr.short_code}`;

  const respond = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}.${ext}"`,
        // Styling can change, so downloads are never cached.
        "Cache-Control": "private, no-store",
      },
    });

  try {
    if (format === "svg") {
      const logo = await fetchLogoBytes(qr.logo_url);
      return respond(await cardQrSvg(target, { dark, logo }), "image/svg+xml", "svg");
    }
    if (format === "pdf") {
      const logo = await fetchLogoBytes(qr.logo_url);
      const pdf = await cardQrPdf(target, { size, dark, logo });
      return respond(new Uint8Array(pdf), "application/pdf", "pdf");
    }
    const png = await cardQrPng(target, { width: size, dark });
    return respond(new Uint8Array(png), "image/png", "png");
  } catch {
    // Never fail a download: fall back to a plain PNG.
    const png = await cardQrPng(target, { width: size });
    return respond(new Uint8Array(png), "image/png", "png");
  }
}
