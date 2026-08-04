import { prisma } from "@/lib/db";
import { mintToken, verifyToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { rsvpConfirmationEmail } from "@/lib/emails";

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

export async function sendConfirmationEmail(guestId: string, eventId: string) {
  const [guest, event] = await Promise.all([
    prisma.guest.findUnique({ where: { id: guestId } }),
    prisma.event.findUnique({ where: { id: eventId } }),
  ]);
  if (!guest || !event) return;

  const checkinToken = mintToken({ kind: "checkin", guestId, eventId });
  const { generateQrDataUrl } = await import("@/lib/qr");
  const qrDataUrl = await generateQrDataUrl(checkinToken);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";
  const confirmationUrl = `${baseUrl}/invite/${(await prisma.invite.findUnique({ where: { guest_id: guestId } }))?.token}/confirmation`;
  const addToCalendarUrl = `${baseUrl}/api/invite/${(await prisma.invite.findUnique({ where: { guest_id: guestId } }))?.token}/ics`;
  const icsUrl = addToCalendarUrl;

  const tpl = rsvpConfirmationEmail({
    guestName: guest.name,
    eventTitle: event.title,
    eventDate: new Intl.DateTimeFormat("en-US", {
      timeZone: event.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(event.starts_at),
    venue: [event.venue_name, event.venue_address].filter(Boolean).join(" · "),
    confirmationUrl,
    qrDataUrl,
    addToCalendarUrl,
    icsUrl,
  });

  await sendEmail({ to: guest.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
}
