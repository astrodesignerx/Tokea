"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { isValidEmail, importGuests, sendPendingInvites } from "@/lib/guests";

const addSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().or(z.literal("")),
});

export async function addGuest(eventId: string, input: { name: string; email: string; phone?: string }) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFoundError("Event not found");
  if (event.owner_id !== user.id) throw ForbiddenError("Not your event");

  const parsed = addSchema.parse(input);
  const email = parsed.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Invalid email");

  try {
    await prisma.guest.create({
      data: {
        event_id: eventId,
        name: parsed.name.trim(),
        email,
        phone: parsed.phone?.trim() || null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint")) throw new Error("This email is already on the guest list");
    throw err;
  }
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

export async function deleteGuest(eventId: string, guestId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFoundError("Event not found");
  if (event.owner_id !== user.id) throw ForbiddenError("Not your event");
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

export async function importGuestsAction(eventId: string, rows: { name: string; email: string; phone?: string }[]) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFoundError("Event not found");
  if (event.owner_id !== user.id) throw ForbiddenError("Not your event");
  return importGuests(eventId, rows);
}

export async function sendAllInvitesAction(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFoundError("Event not found");
  if (event.owner_id !== user.id) throw ForbiddenError("Not your event");
  return sendPendingInvites(eventId);
}
