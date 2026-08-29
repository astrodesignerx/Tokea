import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { settlePayment } from "@/lib/payments";

/**
 * Lets the guest's browser follow a payment to its conclusion.
 *
 * An M-Pesa prompt can sit unanswered on a phone for a minute or more, and the
 * webhook may arrive before, during or after the guest returns. This polls,
 * and, because it calls `settlePayment` too, doubles as a second settlement
 * path when the webhook is slow or blocked. Safe to hammer: settlement has an
 * effect only once.
 *
 * The reference is an unguessable UUID and only exposes payment status, so it
 * needs no session.
 */
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "missing-reference" }, { status: 400 });
  }

  const existing = await prisma.payment.findUnique({
    where: { reference },
    select: { status: true },
  });
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const status =
    existing.status === "pending" ? (await settlePayment(reference)).status : existing.status;

  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
