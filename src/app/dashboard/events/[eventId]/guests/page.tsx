import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { Button } from "@/components/ui/button";
import { GuestTable } from "@/components/guest/guest-table";
import { AddGuestForm } from "@/components/guest/add-guest-form";
import { CsvImport } from "@/components/guest/csv-import";
import { SendInvitesButton } from "@/components/guest/send-invites-button";
import { ArrowLeft, Download } from "lucide-react";

type Params = { eventId: string };

export const metadata = { title: "Guests" };

export default async function GuestsPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (event.owner_id !== user.id) redirect("/dashboard/events");

  const guests = await prisma.guest.findMany({
    where: { event_id: eventId },
    orderBy: { created_at: "asc" },
    include: { invite: true, rsvp: true, checkin: true },
  });

  const serialized = guests.map((g) => ({
    id: g.id,
    name: g.name,
    email: g.email,
    phone: g.phone,
    rsvp: g.rsvp?.status ?? null,
    invited: !!g.invite?.sent_at,
    checkedIn: !!g.checkin,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6">
      <Link href={`/dashboard/events/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) hover:text-foreground motion-reduce:transition-none">
        <ArrowLeft className="size-4" /> {event.title}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="nf-eyebrow">Invitations and RSVPs</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {event.title}, {guests.length} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SendInvitesButton eventId={eventId} unsent={serialized.filter((g) => !g.invited).length} />
          <Button asChild variant="outline" size="sm">
            <a href={`/api/events/${eventId}/export`} download>
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h2 className="nf-eyebrow">Add a guest</h2>
          <div className="nf-panel mt-4 p-6">
            <AddGuestForm eventId={eventId} />
          </div>
        </section>
        <section>
          <h2 className="nf-eyebrow">Import from CSV</h2>
          <div className="nf-panel mt-4 p-6">
            <CsvImport eventId={eventId} />
          </div>
        </section>
      </div>

      <div className="nf-panel overflow-hidden">
        <GuestTable eventId={eventId} guests={serialized} />
      </div>
    </div>
  );
}
