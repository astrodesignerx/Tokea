import { prisma } from "@/lib/db";
import { mintToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/emails";
import { isUniqueViolation } from "@/lib/errors";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type ImportResult = {
  added: number;
  duplicates: number;
  invalid: number;
  errors: { row: number; reason: string }[];
};

export async function importGuests(eventId: string, rows: { name: string; email: string; phone?: string }[]): Promise<ImportResult> {
  const seen = new Set<string>();
  const result: ImportResult = { added: 0, duplicates: 0, invalid: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name ?? "").trim();
    const email = normalizeEmail(row.email ?? "");
    if (!name || !email) {
      result.invalid++;
      result.errors.push({ row: i + 1, reason: "Missing name or email" });
      continue;
    }
    if (!isValidEmail(email)) {
      result.invalid++;
      result.errors.push({ row: i + 1, reason: `Invalid email: ${email}` });
      continue;
    }
    if (seen.has(email)) {
      result.duplicates++;
      result.errors.push({ row: i + 1, reason: `Duplicate in file: ${email}` });
      continue;
    }
    seen.add(email);
    try {
      await prisma.guest.create({
        data: {
          event_id: eventId,
          name,
          email,
          phone: row.phone?.trim() || null,
        },
      });
      result.added++;
    } catch (err) {
      if (isUniqueViolation(err, "email")) {
        result.duplicates++;
        result.errors.push({ row: i + 1, reason: `Already on guest list: ${email}` });
      } else {
        result.invalid++;
        result.errors.push({
          row: i + 1,
          reason: err instanceof Error ? err.message : "Database error",
        });
      }
    }
  }
  return result;
}

export async function sendPendingInvites(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";

  const guests = await prisma.guest.findMany({
    where: { event_id: eventId },
    include: { invite: true },
  });

  let sent = 0;
  let failed = 0;
  for (const guest of guests) {
    if (guest.invite?.sent_at) continue;
    const invite = await prisma.invite.upsert({
      where: { guest_id: guest.id },
      update: { token: mintToken({ kind: "invite", guestId: guest.id, eventId: event.id }) },
      create: { guest_id: guest.id, token: mintToken({ kind: "invite", guestId: guest.id, eventId: event.id }) },
    });
    const rsvpUrl = `${baseUrl}/invite/${invite.token}`;
    const tpl = inviteEmail({
      guestName: guest.name,
      eventTitle: event.title,
      eventDate: formatForEmail(event.starts_at, event.timezone),
      venue: [event.venue_name, event.venue_address].filter(Boolean).join(", "),
      rsvpUrl,
    });
    const result = await sendEmail({ to: guest.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    if (result.ok) {
      await prisma.invite.update({ where: { id: invite.id }, data: { sent_at: new Date() } });
      sent++;
    } else {
      failed++;
    }
  }
  return { sent, failed, total: guests.length };
}

function formatForEmail(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
