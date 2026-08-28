import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { getEventCounts } from "@/lib/queries/events";
import { publishEvent, unpublishEvent, deleteEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatEventDateTime } from "@/lib/format";
import { eventPricing, formatMoney } from "@/lib/money";
import { Users, ScanLine, ExternalLink, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";

type Params = { eventId: string };

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (event.owner_id !== user.id) redirect("/dashboard");

  const counts = await getEventCounts(eventId);
  const pricing = eventPricing(event);
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012"}/e/${event.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight truncate">{event.title}</h1>
            <Badge variant={event.status === "published" ? "success" : "muted"}>{event.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{formatEventDateTime(event.starts_at, event.timezone)}</p>
          {pricing && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-foreground font-medium">
                {formatMoney(pricing.price, pricing.currency)}
              </span>
              {pricing.deposit != null && (
                <>
                  {" · "}
                  {formatMoney(pricing.deposit, pricing.currency)} deposit,{" "}
                  {formatMoney(pricing.balanceAfterDeposit ?? 0, pricing.currency)} at the door
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/events/${event.id}/edit`}>Edit</Link>
          </Button>
          {event.status === "published" ? (
            <form
              action={async () => {
                "use server";
                await unpublishEvent(event.id);
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Unpublish
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await publishEvent(event.id);
              }}
            >
              <Button type="submit" size="sm">
                Publish
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Stat label="Confirmed" value={counts.yes} />
        <Stat label="Declined" value={counts.no} />
        <Stat label="Maybe" value={counts.maybe} />
        <Stat label="Pending" value={counts.pending} />
        <Stat label="Checked in" value={counts.checkedIn} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with anyone. They see the event page and (if they are a guest) an RSVP form.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="text-xs flex-1 truncate">{publicUrl}</code>
              <CopyButton value={publicUrl} />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/e/${event.slug}`} target="_blank">
                <ExternalLink className="size-4" /> Open public page
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/dashboard/events/${event.id}/guests`}>
                <Users className="size-4" /> Manage guests
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/dashboard/events/${event.id}/checkin`}>
                <ScanLine className="size-4" /> Open check-in
              </Link>
            </Button>
            <Separator />
            <div className="space-y-1.5">
              <HoldToConfirm
                label="Hold to delete event"
                icon={<Trash2 className="size-4" />}
                onConfirm={async () => {
                  "use server";
                  await deleteEvent(event.id);
                }}
              />
              <p className="px-3 text-xs text-muted-foreground">{deleteWarning(counts.total)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Deleting an event cascades to its guests, invites, RSVPs and check-ins. The
 * button names the event so it can't be misread as deleting the guest list;
 * this line spells out what goes with it.
 */
function deleteWarning(guestCount: number): string {
  if (guestCount === 0) return "This can't be undone.";
  const guests = guestCount === 1 ? "1 guest" : `${guestCount} guests`;
  return `Also removes ${guests} and their RSVPs. This can't be undone.`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
