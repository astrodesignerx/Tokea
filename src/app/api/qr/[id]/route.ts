import { auth } from "@/lib/auth";
import { getCardsOrigin } from "@/lib/cards/links";
import { cardQrPng, ensureScannableDark } from "@/lib/cards/qr";
import { findOwnedQrCode } from "@/lib/qr-codes/data";
import { designFromRow } from "@/lib/qr-codes/design";
import { qrPath } from "@/lib/qr-codes/links";
import { loadLogo, styledQrPdf, styledQrSvg } from "@/lib/qr-codes/render";

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
 *   ?format=svg|pdf|png|logo  default svg
 *   (logo returns the code's logo file, so the dashboard can build PDFs in
 *   the browser without cross-site image rules getting in the way)
 *   ?size=256..2048      pixel width (SVG) or point width (PDF)
 *
 * SVG and PDF carry the full design. The dashboard makes PNGs in the browser
 * from the SVG, because turning SVG into pixels on the server needs a native
 * image library, and one of those has taken the live site down before. The
 * PNG here is the plain fallback: right colour, no shapes, logo or frame.
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
  const format = (url.searchParams.get("format") ?? "svg").toLowerCase();

  const target = `${await getCardsOrigin()}${qrPath(qr.short_code)}`;
  const design = designFromRow(qr);
  const filename = `qr-${qr.short_code}`;

  const respond = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}.${ext}"`,
        // Styling can change, so downloads are never cached.
        "Cache-Control": "private, no-store",
        // Logos are user-supplied files served from this site. An SVG can
        // carry script, so nothing in these responses may ever run.
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });

  const plainPng = async () =>
    respond(
      new Uint8Array(await cardQrPng(target, { width: size, dark: ensureScannableDark(qr.colour) })),
      "image/png",
      "png"
    );

  try {
    if (format === "pdf") {
      const pdf = await styledQrPdf(target, design, qr.logo_url, size);
      return respond(new Uint8Array(pdf), "application/pdf", "pdf");
    }
    if (format === "png") return await plainPng();
    if (format === "logo") {
      const logo = await loadLogo(qr.logo_url);
      if (!logo) return new Response("No logo", { status: 404 });
      const ext = logo.mime.split("/")[1]?.replace("+xml", "") ?? "img";
      return respond(new Uint8Array(logo.bytes), logo.mime, ext);
    }
    return respond(await styledQrSvg(target, design, qr.logo_url, size), "image/svg+xml", "svg");
  } catch {
    // Never fail a download: fall back to a plain PNG.
    return plainPng();
  }
}
