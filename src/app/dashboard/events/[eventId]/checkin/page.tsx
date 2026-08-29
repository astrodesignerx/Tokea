import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { getEventCounts } from "@/lib/queries/events";
import { CheckinClient } from "@/components/checkin/checkin-client";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Check-in</h1>
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
