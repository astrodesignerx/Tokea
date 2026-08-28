import { findCardBySlug } from "@/lib/cards/data";
import { shortUrl } from "@/lib/cards/links";
import { buildVCard, vCardFileName } from "@/lib/cards/vcard";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const card = await findCardBySlug(slug);

  if (!card || card.status !== "active") {
    return new Response("Not found", { status: 404 });
  }

  const body = buildVCard(card, await shortUrl(card.short_code));

  return new Response(body, {
    headers: {
      // charset matters: without it iOS mangles non-ASCII names on import.
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vCardFileName(card)}"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
