"use server";

import { z } from "zod";
import { submitRsvp } from "@/lib/rsvp";

const schema = z.object({
  token: z.string().min(1),
  status: z.enum(["yes", "no", "maybe"]),
  customAnswer: z.string().max(1000).optional(),
  message: z.string().max(2000).optional(),
});

export async function submitRsvpAction(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const { guestId, eventId } = await submitRsvp(parsed);
  return {
    guestId,
    eventId,
    redirectTo: `/invite/${parsed.token}/confirmation`,
  };
}
