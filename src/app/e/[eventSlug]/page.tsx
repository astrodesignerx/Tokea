import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/components/templates";
import { formatEventDateTime } from "@/lib/format";

type Params = { eventSlug: string };

async function loadEvent(slug: string) {
  return prisma.event.findFirst({
    where: { slug, status: "published" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      starts_at: true,
      timezone: true,
      venue_name: true,
      venue_address: true,
      cover_image_url: true,
      cover_motion: true,
      template: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { eventSlug } = await params;
  const event = await loadEvent(eventSlug);
  if (!event) return { title: "Event not found" };
  const date = formatEventDateTime(event.starts_at, event.timezone);
  const description = event.description?.slice(0, 200) ?? `Join us ${date}`;
  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images: event.cover_image_url ? [{ url: event.cover_image_url, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.cover_image_url ? [event.cover_image_url] : undefined,
    },
  };
}

export default async function PublicEventPage({ params }: { params: Promise<Params> }) {
  const { eventSlug } = await params;
  const event = await loadEvent(eventSlug);
  if (!event) notFound();
  return renderTemplate(event.template, {
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    timezone: event.timezone,
    venueName: event.venue_name,
    venueAddress: event.venue_address,
    coverImageUrl: event.cover_image_url,
    coverMotion: event.cover_motion === "drift" ? "drift" : "none",
    rsvpHref: null,
    isPreview: true,
  });
}
