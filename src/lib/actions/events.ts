"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { getOwnedEvent } from "@/lib/queries/events";
import { isUniqueViolation } from "@/lib/errors";
import { slugify, withCollisionSuffix } from "@/lib/slug";
import { COVER_MOTION_IDS, TEMPLATE_IDS } from "@/lib/templates";
import { DEFAULT_CURRENCY, PAYMENT_MODES } from "@/lib/money";

// Each attempt appends 4 random chars from a 36-char alphabet, so a second
// collision is already vanishingly unlikely; this is just a safety stop.
const MAX_SLUG_ATTEMPTS = 5;

const eventFields = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(20000).optional().or(z.literal("")),
  starts_at: z.string().min(1, "Start date is required"),
  timezone: z.string().min(1, "Timezone is required"),
  venue_name: z.string().max(200).optional().or(z.literal("")),
  venue_address: z.string().max(500).optional().or(z.literal("")),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  custom_question: z.string().max(500).optional().or(z.literal("")),
  template: z.enum(TEMPLATE_IDS),
  cover_motion: z.enum(COVER_MOTION_IDS).default("none"),
  // "No reminder" arrives as null from the form. z.null() has to be matched
  // before the coercing branch — z.coerce.number() turns null into 0, which
  // reads downstream as "remind on the day of the event".
  reminder_days_before: z
    .union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(30)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),

  // Amounts arrive already in minor units — the form converts once, at the
  // input edge. Trusting the client is fine here because these are the
  // organiser's own prices for their own event. What a *guest* is charged is
  // read back off this row, never sent by a browser.
  payment_mode: z.enum(PAYMENT_MODES).default("free"),
  currency: z.string().trim().length(3).default(DEFAULT_CURRENCY),
  price_amount: z.number().int().positive().nullable().default(null),
  deposit_amount: z.number().int().positive().nullable().default(null),
});

/** A paid event needs a price, and a deposit only makes sense below it. */
function pricingRules(value: z.infer<typeof eventFields>, ctx: z.RefinementCtx) {
  if (value.payment_mode !== "paid") return;

  if (value.price_amount == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price_amount"],
      message: "Set a ticket price, or make the event free",
    });
    return;
  }
  if (value.deposit_amount != null && value.deposit_amount >= value.price_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deposit_amount"],
      message: "Deposit must be less than the full price",
    });
  }
}

const eventSchema = eventFields.superRefine(pricingRules);

export type EventFormInput = z.infer<typeof eventSchema>;

export async function createEvent(input: EventFormInput) {
  const user = await requireUser();
  const parsed = eventSchema.parse(input);

  const baseSlug = slugify(parsed.title);
  const data = {
    owner_id: user.id,
    title: parsed.title,
    description: parsed.description || null,
    starts_at: new Date(parsed.starts_at),
    timezone: parsed.timezone,
    venue_name: parsed.venue_name || null,
    venue_address: parsed.venue_address || null,
    cover_image_url: parsed.cover_image_url || null,
    cover_motion: parsed.cover_motion,
    payment_mode: parsed.payment_mode,
    currency: parsed.currency,
    price_amount: parsed.price_amount,
    deposit_amount: parsed.deposit_amount,
    custom_question: parsed.custom_question || null,
    template: parsed.template,
    reminder_days_before: parsed.reminder_days_before ?? null,
    status: "draft",
  };

  // Insert and let the unique index on `slug` arbitrate. Checking for a free
  // slug before inserting can't be made correct — another request can claim it
  // between the read and the write.
  let event;
  for (let attempt = 1; ; attempt++) {
    try {
      event = await prisma.event.create({
        data: { ...data, slug: withCollisionSuffix(baseSlug) },
      });
      break;
    } catch (err) {
      if (attempt >= MAX_SLUG_ATTEMPTS || !isUniqueViolation(err, "slug")) throw err;
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${event.id}`);
}

const updateSchema = eventFields.extend({ id: z.string().min(1) }).superRefine(pricingRules);

export async function updateEvent(input: EventFormInput & { id: string }) {
  const user = await requireUser();
  const parsed = updateSchema.parse(input);
  const existing = await getOwnedEvent(parsed.id, user.id);

  await prisma.event.update({
    where: { id: parsed.id },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      starts_at: new Date(parsed.starts_at),
      timezone: parsed.timezone,
      venue_name: parsed.venue_name || null,
      venue_address: parsed.venue_address || null,
      cover_image_url: parsed.cover_image_url || null,
      cover_motion: parsed.cover_motion,
      payment_mode: parsed.payment_mode,
      currency: parsed.currency,
      price_amount: parsed.price_amount,
      deposit_amount: parsed.deposit_amount,
      custom_question: parsed.custom_question || null,
      template: parsed.template,
      reminder_days_before: parsed.reminder_days_before ?? null,
    },
  });

  revalidatePath(`/dashboard/events/${parsed.id}`);
  revalidatePath(`/e/${existing.slug}`);
  redirect(`/dashboard/events/${parsed.id}`);
}

async function setEventStatus(eventId: string, status: "published" | "draft") {
  const user = await requireUser();
  const event = await getOwnedEvent(eventId, user.id);
  await prisma.event.update({ where: { id: eventId }, data: { status } });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${event.slug}`);
}

export async function publishEvent(eventId: string) {
  await setEventStatus(eventId, "published");
}

export async function unpublishEvent(eventId: string) {
  await setEventStatus(eventId, "draft");
}

export async function deleteEvent(eventId: string) {
  const user = await requireUser();
  await getOwnedEvent(eventId, user.id);
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
