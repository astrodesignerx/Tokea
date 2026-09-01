import { findCardBySlug } from "@/lib/cards/data";
import { shortUrl } from "@/lib/cards/links";
import { cardQrPdf, cardQrPng, cardQrSvg, ensureScannableDark, fetchLogoBytes } from "@/lib/cards/qr";

type RouteContext = { params: Promise<{ slug: string }> };

const MIN_SIZE = 256;
const MAX_SIZE = 2048;
const DEFAULT_SIZE = 1024;

/**
 * Print-ready QR for a card. Always encodes the short link, so artwork produced
 * from this endpoint keeps working after a slug change.
 * Query params:
 *   ?size=256..2048  raster size for PNG/PDF
 *   ?format=png|svg|pdf  default png (keeps old links working)
 *   ?colour=brand  tints modules with a scannable brand colour
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const card = await findCardBySlug(slug);

  if (!card) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("size"));
  const size = Number.isFinite(requested)
    ? Math.min(Math.max(requested, MIN_SIZE), MAX_SIZE)
    : DEFAULT_SIZE;

  const format = (url.searchParams.get("format") ?? "png").toLowerCase();
  const brand = url.searchParams.get("colour") === "brand";
  const dark = brand ? ensureScannableDark(card.organisation.brand_primary) : undefined;

  const short = await shortUrl(card.short_code);

  try {
    if (format === "svg") {
      const logo = await fetchLogoBytes(card.organisation.logo_url);
      const svg = await cardQrSvg(short, { dark, logo });
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `inline; filename="${card.slug}-qr.svg"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (format === "pdf") {
      const logo = await fetchLogoBytes(card.organisation.logo_url);
      const pdf = await cardQrPdf(short, { size, dark, logo });
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${card.slug}-qr.pdf"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const png = await cardQrPng(short, { width: size, dark });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${card.slug}-qr.png"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    // Never 500 the download — fall back to plain PNG
    const png = await cardQrPng(short, { width: size });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${card.slug}-qr.png"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
