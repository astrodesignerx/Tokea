import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (event.owner_id !== user.id) redirect("/dashboard");

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
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {event.title}, {guests.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SendInvitesButton eventId={eventId} unsent={serialized.filter((g) => !g.invited).length} />
          <Button asChild variant="outline" size="sm">
            <a href={`/api/events/${eventId}/export`} download>
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a guest</CardTitle>
          </CardHeader>
          <CardContent>
            <AddGuestForm eventId={eventId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import from CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <CsvImport eventId={eventId} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <GuestTable eventId={eventId} guests={serialized} />
        </CardContent>
      </Card>
    </div>
  );
}
