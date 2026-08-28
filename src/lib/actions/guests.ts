"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { getOwnedEvent } from "@/lib/queries/events";
import { isUniqueViolation } from "@/lib/errors";
import { isValidEmail, importGuests, sendPendingInvites } from "@/lib/guests";

const addSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().or(z.literal("")),
});

/**
 * Any change to the guest list moves the counts on the event overview as well
 * as the table itself, so both pages have to be refreshed.
 */
function revalidateGuestViews(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

export async function addGuest(eventId: string, input: { name: string; email: string; phone?: string }) {
  const user = await requireUser();
  await getOwnedEvent(eventId, user.id);

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
    if (isUniqueViolation(err, "email")) {
      throw new Error("This email is already on the guest list");
    }
    throw err;
  }
  revalidateGuestViews(eventId);
}

export async function deleteGuest(eventId: string, guestId: string) {
  const user = await requireUser();
  await getOwnedEvent(eventId, user.id);
  // Scope by event_id so a guest id from another event can't be deleted.
  await prisma.guest.deleteMany({ where: { id: guestId, event_id: eventId } });
  revalidateGuestViews(eventId);
}

export async function importGuestsAction(eventId: string, rows: { name: string; email: string; phone?: string }[]) {
  const user = await requireUser();
  await getOwnedEvent(eventId, user.id);
  const result = await importGuests(eventId, rows);
  revalidateGuestViews(eventId);
  return result;
}

export async function sendAllInvitesAction(eventId: string) {
  const user = await requireUser();
  await getOwnedEvent(eventId, user.id);
  const result = await sendPendingInvites(eventId);
  revalidateGuestViews(eventId);
  return result;
}
