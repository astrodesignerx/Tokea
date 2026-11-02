import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { getEventCounts } from "@/lib/queries/events";
import { CheckinClient } from "@/components/checkin/checkin-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Params = { eventId: string };

export const metadata = { title: "Check-in" };

export default async function CheckinPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (event.owner_id !== user.id) redirect("/dashboard/events");

  const counts = await getEventCounts(eventId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6">
      <Link href={`/dashboard/events/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) hover:text-foreground motion-reduce:transition-none">
        <ArrowLeft className="size-4" /> {event.title}
      </Link>
      <div>
        <p className="nf-eyebrow">Invitations and RSVPs</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Check-in</h1>
        <p className="text-sm text-muted-foreground mt-1">{event.title}</p>
      </div>
      <CheckinClient
        eventId={eventId}
        initial={{
          total: counts.total,
          yes: counts.yes,
          checkedIn: counts.checkedIn,
        }}
      />
    </div>
  );
}
