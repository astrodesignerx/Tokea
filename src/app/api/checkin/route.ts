import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";
import { eventPricing } from "@/lib/money";
import { guestPaymentState } from "@/lib/payments";

const schema = z.object({
  qrToken: z.string().min(1),
  eventId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = schema.parse(await req.json());
  const event = await prisma.event.findUnique({ where: { id: body.eventId } });
  if (!event || event.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Not your event" }, { status: 403 });
  }
  const verified = verifyToken(body.qrToken, "checkin");
  if (!verified.ok) {
    return NextResponse.json({ error: `Invalid QR (${verified.reason})` }, { status: 400 });
  }
  if (verified.payload.eventId !== body.eventId) {
    return NextResponse.json({ error: "QR is for a different event" }, { status: 400 });
  }
  const guest = await prisma.guest.findUnique({ where: { id: verified.payload.guestId } });
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  // Check-in tokens are stateless HMAC with no revocation list, so a pass
  // minted before a refund still verifies. Payment is therefore re-checked
  // here, at the moment of entry, rather than trusted from the QR.
  const pricing = eventPricing(event);
  const payment = pricing ? await guestPaymentState(guest.id) : null;

  if (pricing && !payment?.hasPaid) {
    return NextResponse.json(
      { error: `${guest.name} has no payment on record`, guestName: guest.name },
      { status: 402 },
    );
  }

  const balanceDue =
    pricing && payment && !payment.paidInFull
      ? Math.max(0, pricing.price - payment.total)
      : 0;

  const money = {
    balanceDue,
    currency: pricing?.currency ?? null,
    amountPaid: payment?.total ?? 0,
  };

  const existing = await prisma.checkIn.findUnique({ where: { guest_id: guest.id } });
  if (existing) {
    return NextResponse.json({
      ok: true,
      guestName: guest.name,
      alreadyCheckedIn: true,
      at: existing.checked_in_at,
      ...money,
    });
  }
  await prisma.checkIn.create({ data: { guest_id: guest.id } });
  return NextResponse.json({
    ok: true,
    guestName: guest.name,
    alreadyCheckedIn: false,
    at: new Date().toISOString(),
    ...money,
  });
}
