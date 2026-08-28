import { prisma } from "@/lib/db";
import { mintToken } from "@/lib/tokens";
import { generateQrDataUrl } from "@/lib/qr";
import { sendEmail } from "@/lib/email";
import { rsvpConfirmationEmail } from "@/lib/emails";

/**
 * Sends the "you're confirmed" email, including the check-in QR.
 *
 * This mints a working door pass, so it is only ever called once a spot is
 * genuinely secured: an RSVP of yes on a free event, or a settled payment on a
 * paid one. It lives here rather than in lib/rsvp.ts so both paths can reach
 * it without the two modules importing each other.
 */
export async function sendConfirmationEmail(guestId: string, eventId: string) {
  const [guest, event] = await Promise.all([
    prisma.guest.findUnique({ where: { id: guestId } }),
    prisma.event.findUnique({ where: { id: eventId } }),
  ]);
  if (!guest || !event) return;

  const invite = await prisma.invite.findUnique({ where: { guest_id: guestId } });
  if (!invite) return;

  const checkinToken = mintToken({ kind: "checkin", guestId, eventId });
  const qrDataUrl = await generateQrDataUrl(checkinToken);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";
  const confirmationUrl = `${baseUrl}/invite/${invite.token}/confirmation`;
  const icsUrl = `${baseUrl}/api/invite/${invite.token}/ics`;

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
    addToCalendarUrl: icsUrl,
    icsUrl,
  });

  await sendEmail({ to: guest.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
}
