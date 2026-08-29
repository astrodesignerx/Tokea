import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";
import { eventPricing } from "@/lib/money";
import { sendConfirmationEmail } from "@/lib/confirmation-email";
import {
  initializeTransaction,
  isPaystackConfigured,
  newReference,
  verifyTransaction,
} from "@/lib/paystack";

export const PAYMENT_KINDS = ["deposit", "full"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export type StartPaymentResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; reason: string };

/**
 * What a guest has actually paid.
 *
 * Only rows with status "success" count. Everything that decides whether
 * someone is confirmed, or gets a QR, or owes money at the door reads this.
 */
export async function guestPaymentState(guestId: string) {
  const paid = await prisma.payment.findMany({
    where: { guest_id: guestId, status: "success" },
    select: { amount_paid: true, amount: true, kind: true, currency: true },
  });

  const total = paid.reduce((sum, p) => sum + (p.amount_paid ?? p.amount), 0);
  return {
    hasPaid: paid.length > 0,
    total,
    paidInFull: paid.some((p) => p.kind === "full"),
    currency: paid[0]?.currency ?? null,
  };
}

/**
 * Creates a pending payment and hands back a Paystack checkout URL.
 *
 * The amount is read from the event, never from the caller. The browser only
 * gets to say "deposit" or "full".
 */
export async function startPayment(input: {
  token: string;
  kind: PaymentKind;
}): Promise<StartPaymentResult> {
  const verified = verifyToken(input.token, "invite");
  if (!verified.ok) return { ok: false, reason: "This invitation link is no longer valid." };

  const guest = await prisma.guest.findUnique({
    where: { id: verified.payload.guestId },
    include: { event: { include: { owner: { select: { paystack_subaccount: true } } } } },
  });
  if (!guest || guest.event_id !== verified.payload.eventId) {
    return { ok: false, reason: "This invitation link is no longer valid." };
  }

  const pricing = eventPricing(guest.event);
  if (!pricing) return { ok: false, reason: "This event doesn't take payments." };

  if (input.kind === "deposit" && pricing.deposit == null) {
    return { ok: false, reason: "This event doesn't offer a deposit." };
  }
  const amount = input.kind === "deposit" ? pricing.deposit! : pricing.price;

  const already = await guestPaymentState(guest.id);
  if (already.paidInFull) return { ok: false, reason: "You've already paid for this event." };

  if (!isPaystackConfigured()) {
    return { ok: false, reason: "Payments aren't set up for this event yet." };
  }

  const reference = newReference();
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3012";

  await prisma.payment.create({
    data: {
      reference,
      guest_id: guest.id,
      event_id: guest.event_id,
      kind: input.kind,
      amount,
      currency: pricing.currency,
      status: "pending",
    },
  });

  const init = await initializeTransaction({
    email: guest.email,
    amount,
    currency: pricing.currency,
    reference,
    callbackUrl: `${baseUrl}/invite/${input.token}/confirmation?reference=${reference}`,
    subaccount: guest.event.owner.paystack_subaccount,
    metadata: { guestId: guest.id, eventId: guest.event_id, kind: input.kind },
  });

  if (!init.ok) {
    await prisma.payment.updateMany({
      where: { reference, status: "pending" },
      data: { status: "failed" },
    });
    console.error("[payments] initialize failed", init.reason);
    return { ok: false, reason: "Couldn't start the payment. Please try again." };
  }

  return { ok: true, authorizationUrl: init.data.authorization_url, reference };
}

export type SettleOutcome =
  | { status: "success" }
  | { status: "pending" }
  | { status: "failed"; reason: string }
  | { status: "unknown" };

/**
 * Brings a payment to its final state, safely, from either direction.
 *
 * Both the Paystack webhook and the guest's browser call this with the same
 * reference. Paystack retries a failed webhook for 72 hours, and the browser
 * polls independently, so this runs many times for one payment and must have
 * an effect exactly once.
 *
 * The single-transition guarantee is the `status: "pending"` filter on the
 * update: whichever caller wins flips the row and gets count 1, everyone else
 * gets 0 and does nothing. The confirmation email (which contains a working
 * door pass) is sent only by the winner.
 */
export async function settlePayment(reference: string): Promise<SettleOutcome> {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return { status: "unknown" };
  if (payment.status === "success") return { status: "success" };
  if (payment.status === "failed" || payment.status === "abandoned") {
    return { status: "failed", reason: payment.status };
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok) {
    // Could not reach Paystack, so leave it pending for a retry to settle.
    return { status: "pending" };
  }

  const txn = verified.data;

  if (txn.status !== "success") {
    if (txn.status === "abandoned" || txn.status === "failed") {
      await prisma.payment.updateMany({
        where: { reference, status: "pending" },
        data: { status: txn.status },
      });
      return { status: "failed", reason: txn.status };
    }
    // ongoing / pending, an M-Pesa prompt still sitting on someone's phone
    return { status: "pending" };
  }

  // Never accept a success that doesn't match what we asked for. A mismatch
  // means the amount was tampered with or the reference was reused.
  if (txn.amount !== payment.amount || txn.currency !== payment.currency) {
    console.error(
      `[payments] amount mismatch on ${reference}: expected ${payment.amount} ${payment.currency}, got ${txn.amount} ${txn.currency}`,
    );
    return { status: "failed", reason: "amount-mismatch" };
  }

  const claimed = await prisma.payment.updateMany({
    where: { reference, status: "pending" },
    data: {
      status: "success",
      amount_paid: txn.amount,
      channel: txn.channel,
      provider_txn_id: String(txn.id),
      paid_at: txn.paid_at ? new Date(txn.paid_at) : new Date(),
    },
  });

  // Someone else already settled this one; they own the side effects.
  if (claimed.count === 0) return { status: "success" };

  await prisma.rSVP.upsert({
    where: { guest_id: payment.guest_id },
    update: { status: "yes", responded_at: new Date() },
    create: { guest_id: payment.guest_id, status: "yes" },
  });

  await sendConfirmationEmail(payment.guest_id, payment.event_id);

  return { status: "success" };
}
