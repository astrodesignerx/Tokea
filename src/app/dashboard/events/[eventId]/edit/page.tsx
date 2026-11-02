import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { EventForm } from "@/components/event/event-form";

type Params = { eventId: string };

export const metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (event.owner_id !== user.id) redirect("/dashboard/events");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/dashboard/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) hover:text-foreground motion-reduce:transition-none">
        <ArrowLeft className="size-4" /> {event.title}
      </Link>
      <p className="nf-eyebrow mt-6">Invitations and RSVPs</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Edit event</h1>
      <p className="text-sm text-muted-foreground mt-1">Changes appear on the public page immediately.</p>
      <div className="mt-8">
        <EventForm
          initial={{
            id: event.id,
            title: event.title,
            description: event.description,
            starts_at: event.starts_at,
            timezone: event.timezone,
            venue_name: event.venue_name,
            venue_address: event.venue_address,
            cover_image_url: event.cover_image_url,
            custom_question: event.custom_question,
            template: event.template,
            cover_motion: event.cover_motion,
            reminder_days_before: event.reminder_days_before,
            payment_mode: event.payment_mode,
            currency: event.currency,
            price_amount: event.price_amount,
            deposit_amount: event.deposit_amount,
          }}
        />
      </div>
    </div>
  );
}
