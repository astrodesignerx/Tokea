import { findCardBySlug } from "@/lib/cards/data";
import { shortUrl } from "@/lib/cards/links";
import {
  cardQrPng,
  ensureScannableDark,
  fetchLogoBytes,
} from "@/lib/cards/qr";

type RouteContext = { params: Promise<{ slug: string }> };

const MIN_SIZE = 256;
const MAX_SIZE = 2048;
const DEFAULT_SIZE = 1024;

/**
 * Print-ready QR for a card. Always encodes the short link, so artwork produced
 * from this endpoint keeps working after a slug change. Optionally carries the
 * organisation's logo in the centre, and — with ?colour=brand — modules tinted
 * with a scannable version of the brand colour.
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

  const brand = url.searchParams.get("colour") === "brand";
  const dark = brand ? ensureScannableDark(card.organisation.brand_primary) : undefined;
  const logo = await fetchLogoBytes(card.organisation.logo_url);

  const png = await cardQrPng(await shortUrl(card.short_code), {
    width: size,
    dark,
    logo,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${card.slug}-qr.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
