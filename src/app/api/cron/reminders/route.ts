import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { reminderEmail } from "@/lib/emails";
import { mintToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const provided = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: "published",
      reminder_days_before: { not: null },
      reminder_sent_at: null,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";
  let processed = 0;
  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    if (event.reminder_days_before == null) continue;
    const dueAt = new Date(event.starts_at);
    dueAt.setUTCDate(dueAt.getUTCDate() - event.reminder_days_before);
    if (now < dueAt) continue;
    processed++;

    const guests = await prisma.guest.findMany({
      where: {
        event_id: event.id,
        rsvp: { status: { not: "no" } },
      },
      include: { rsvp: true, invite: true },
    });

    const eventDate = new Intl.DateTimeFormat("en-US", {
      timeZone: event.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(event.starts_at);

    for (const guest of guests) {
      const existing = await prisma.cronedReminder.findUnique({
        where: { event_id_guest_id: { event_id: event.id, guest_id: guest.id } },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const invite = await prisma.invite.findUnique({ where: { guest_id: guest.id } });
      const token = invite?.token ?? mintToken({ kind: "invite", guestId: guest.id, eventId: event.id });
      const tpl = reminderEmail({
        guestName: guest.name,
        eventTitle: event.title,
        eventDate,
        venue: [event.venue_name, event.venue_address].filter(Boolean).join(" · "),
        rsvpUrl: `${baseUrl}/invite/${token}`,
      });
      const result = await sendEmail({ to: guest.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      if (result.ok) {
        await prisma.cronedReminder.create({
          data: { event_id: event.id, guest_id: guest.id },
        });
        sent++;
      } else {
        skipped++;
      }
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { reminder_sent_at: new Date() },
    });
  }

  return NextResponse.json({ processed, sent, skipped });
}
