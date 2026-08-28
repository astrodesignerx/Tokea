import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";
import { eventPricing } from "@/lib/money";
import { guestPaymentState } from "@/lib/payments";
import { sendConfirmationEmail } from "@/lib/confirmation-email";

export type ResolvedInvite = {
  ok: true;
  guest: { id: string; name: string; email: string; phone: string | null };
  event: {
    id: string;
    title: string;
    description: string | null;
    starts_at: Date;
    timezone: string;
    venue_name: string | null;
    venue_address: string | null;
    custom_question: string | null;
    status: string;
    payment_mode: string;
    currency: string;
    price_amount: number | null;
    deposit_amount: number | null;
  };
  token: string;
  rsvpStatus: string | null;
};

export async function resolveInvite(token: string): Promise<ResolvedInvite | { ok: false; reason: string }> {
  const verified = verifyToken(token, "invite");
  if (!verified.ok) return { ok: false, reason: verified.reason };
  const guest = await prisma.guest.findUnique({
    where: { id: verified.payload.guestId },
    include: { event: true, rsvp: true },
  });
  if (!guest || guest.event_id !== verified.payload.eventId) {
    return { ok: false, reason: "malformed" };
  }
  await prisma.invite.updateMany({
    where: { guest_id: guest.id, opened_at: null },
    data: { opened_at: new Date() },
  });
  return {
    ok: true,
    token,
    guest: { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone },
    event: {
      id: guest.event.id,
      title: guest.event.title,
      description: guest.event.description,
      starts_at: guest.event.starts_at,
      timezone: guest.event.timezone,
      venue_name: guest.event.venue_name,
      venue_address: guest.event.venue_address,
      custom_question: guest.event.custom_question,
      status: guest.event.status,
      payment_mode: guest.event.payment_mode,
      currency: guest.event.currency,
      price_amount: guest.event.price_amount,
      deposit_amount: guest.event.deposit_amount,
    },
    rsvpStatus: guest.rsvp?.status ?? null,
  };
}

export async function submitRsvp(input: {
  token: string;
  status: "yes" | "no" | "maybe";
  customAnswer?: string;
  message?: string;
}) {
  const verified = verifyToken(input.token, "invite");
  if (!verified.ok) throw new Error("Invalid token");
  const guest = await prisma.guest.findUnique({
    where: { id: verified.payload.guestId },
    include: { event: true },
  });
  if (!guest) throw new Error("Guest not found");

  // On a paid event a spot is secured by paying, not by answering. Without
  // this a guest could confirm through the free path and be emailed a working
  // door pass without ever being charged. Settlement sets "yes" itself.
  if (input.status === "yes" && eventPricing(guest.event)) {
    const paid = await guestPaymentState(guest.id);
    if (!paid.hasPaid) {
      throw new Error("This event needs payment to confirm your spot.");
    }
  }

  await prisma.rSVP.upsert({
    where: { guest_id: guest.id },
    update: {
      status: input.status,
      custom_answer: input.customAnswer?.trim() || null,
      message: input.message?.trim() || null,
      responded_at: new Date(),
    },
    create: {
      guest_id: guest.id,
      status: input.status,
      custom_answer: input.customAnswer?.trim() || null,
      message: input.message?.trim() || null,
    },
  });

  if (input.status === "yes" && guest.event.status === "published") {
    await sendConfirmationEmail(guest.id, guest.event.id);
  }

  return { guestId: guest.id, eventId: guest.event.id };
}
