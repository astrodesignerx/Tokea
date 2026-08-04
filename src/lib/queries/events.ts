import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function getOwnedEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw NotFoundError("Event not found");
  if (event.owner_id !== userId) throw ForbiddenError("Not your event");
  return event;
}

export async function getEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { owner: { select: { name: true, email: true } } },
  });
  if (!event || event.status !== "published") return null;
  return event;
}

export type EventCounts = {
  total: number;
  yes: number;
  no: number;
  maybe: number;
  pending: number;
  checkedIn: number;
};

export async function getEventCounts(eventId: string): Promise<EventCounts> {
  const [total, yes, no, maybe, checkedIn] = await Promise.all([
    prisma.guest.count({ where: { event_id: eventId } }),
    prisma.rSVP.count({ where: { guest: { event_id: eventId }, status: "yes" } }),
    prisma.rSVP.count({ where: { guest: { event_id: eventId }, status: "no" } }),
    prisma.rSVP.count({ where: { guest: { event_id: eventId }, status: "maybe" } }),
    prisma.checkIn.count({ where: { guest: { event_id: eventId } } }),
  ]);
  return {
    total,
    yes,
    no,
    maybe,
    pending: total - (yes + no + maybe),
    checkedIn,
  };
}

export async function listEventsByOwner(userId: string) {
  return prisma.event.findMany({
    where: { owner_id: userId },
    orderBy: { starts_at: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      starts_at: true,
      status: true,
      cover_image_url: true,
      template: true,
    },
  });
}
