import { findCardByShortCode } from "@/lib/cards/data";
import { CARDS_INDEX_PATH, getCardsOrigin } from "@/lib/cards/links";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * Resolves a printed short code to wherever that card currently lives.
 *
 * This indirection is the whole point of the short code: the QR on a printed
 * card encodes /s/<code> forever, and the destination behind it can change as
 * often as needed. Repoint a code when someone's slug changes, when they move
 * team, or to a farewell page when they leave.
 *
 * Two things here are load-bearing:
 *
 * 1. The redirect is 307, never 301/308. Browsers cache a permanent redirect
 *    indefinitely, which would freeze the destination on every device that had
 *    already scanned the code and defeat the entire mechanism.
 * 2. Cache-Control is no-store, so proxies and CDNs do not do the same thing
 *    on the browser's behalf.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  const card = await findCardByShortCode(code);
  const origin = await getCardsOrigin();

  // An unknown or retired code lands on the card index rather than a dead end:
  // whoever scanned it is holding a piece of paper that was valid once.
  const target =
    card && card.status === "active" ? card.destination : CARDS_INDEX_PATH;

  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(target, origin).toString(),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
