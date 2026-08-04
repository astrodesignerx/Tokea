"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { slugify, withCollisionSuffix } from "@/lib/slug";

const TEMPLATES = ["image-led", "type-led", "minimal", "birthday", "conference"] as const;

const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(20000).optional().or(z.literal("")),
  starts_at: z.string().min(1, "Start date is required"),
  timezone: z.string().min(1, "Timezone is required"),
  venue_name: z.string().max(200).optional().or(z.literal("")),
  venue_address: z.string().max(500).optional().or(z.literal("")),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  custom_question: z.string().max(500).optional().or(z.literal("")),
  template: z.enum(TEMPLATES),
  reminder_days_before: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(30)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export type EventFormInput = z.infer<typeof eventSchema>;

export async function createEvent(input: EventFormInput) {
  const user = await requireUser();
  const parsed = eventSchema.parse(input);

  const baseSlug = slugify(parsed.title);
  let slug = withCollisionSuffix(baseSlug);
  for (let i = 0; i < 4; i++) {
    const taken = await prisma.event.findUnique({ where: { slug } });
    if (!taken) break;
    slug = withCollisionSuffix(baseSlug);
  }
  const takenFinal = await prisma.event.findUnique({ where: { slug } });
  if (takenFinal) {
    slug = withCollisionSuffix(`${baseSlug}-${Date.now().toString(36).slice(-4)}`);
  }

  const event = await prisma.event.create({
    data: {
      owner_id: user.id,
      title: parsed.title,
      description: parsed.description || null,
      slug,
      starts_at: new Date(parsed.starts_at),
      timezone: parsed.timezone,
      venue_name: parsed.venue_name || null,
      venue_address: parsed.venue_address || null,
      cover_image_url: parsed.cover_image_url || null,
      custom_question: parsed.custom_question || null,
      template: parsed.template,
      reminder_days_before: parsed.reminder_days_before ?? null,
      status: "draft",
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${event.id}`);
}

const updateSchema = eventSchema.extend({ id: z.string().min(1) });

export async function updateEvent(input: EventFormInput & { id: string }) {
  const user = await requireUser();
  const parsed = updateSchema.parse(input);

  const existing = await prisma.event.findUnique({ where: { id: parsed.id } });
  if (!existing) throw new Error("Event not found");
  if (existing.owner_id !== user.id) throw new Error("Not your event");

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
      custom_question: parsed.custom_question || null,
      template: parsed.template,
      reminder_days_before: parsed.reminder_days_before ?? null,
    },
  });

  revalidatePath(`/dashboard/events/${parsed.id}`);
  revalidatePath(`/e/${existing.slug}`);
  redirect(`/dashboard/events/${parsed.id}`);
}

export async function publishEvent(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (event.owner_id !== user.id) throw new Error("Not your event");
  await prisma.event.update({
    where: { id: eventId },
    data: { status: "published" },
  });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${event.slug}`);
}

export async function unpublishEvent(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (event.owner_id !== user.id) throw new Error("Not your event");
  await prisma.event.update({
    where: { id: eventId },
    data: { status: "draft" },
  });
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${event.slug}`);
}

export async function deleteEvent(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (event.owner_id !== user.id) throw new Error("Not your event");
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
