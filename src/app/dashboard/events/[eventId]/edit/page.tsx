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
  if (event.owner_id !== user.id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Edit event</h1>
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
            reminder_days_before: event.reminder_days_before,
          }}
        />
      </div>
    </div>
  );
}
