import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/payments";

/**
 * Paystack webhook.
 *
 * This is the authoritative path: with M-Pesa the customer often never returns
 * to the browser, so a charge is confirmed here or not at all.
 *
 * Paystack retries every 3 minutes (4 times), then hourly for 72 hours, until
 * it receives a 200, so this answers 200 for anything it has understood, and
 * `settlePayment` is built to run repeatedly without repeating its effects.
 */
export async function POST(req: Request) {
  // The signature is over the exact bytes received. Parsing and re-serialising
  // would change key order and whitespace, and the digest would never match.
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[paystack] rejected webhook with bad or missing signature");
    return NextResponse.json({ error: "invalid-signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    // Signed by Paystack but nothing we can act on. Acknowledge so it stops.
    return NextResponse.json({ received: true });
  }

  if (event.event === "charge.success") {
    const outcome = await settlePayment(reference);
    if (outcome.status === "pending") {
      // Ask Paystack to try again rather than silently dropping the charge.
      return NextResponse.json({ error: "not-settled" }, { status: 503 });
    }
  }

  return NextResponse.json({ received: true });
}
