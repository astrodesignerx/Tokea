import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { getEventCounts } from "@/lib/queries/events";
import { publishEvent, unpublishEvent, deleteEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatEventDateTime } from "@/lib/format";
import { eventPricing, formatMoney } from "@/lib/money";
import { ArrowLeft, Pencil, Users, ScanLine, ExternalLink, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { getEventPrepList } from "@/lib/checklists/data";
import { PrepListPanel } from "@/components/checklists/prep-list-panel";

type Params = { eventId: string };

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (event.owner_id !== user.id) redirect("/dashboard/events");

  const counts = await getEventCounts(eventId);
  const prepList = await getEventPrepList(eventId, user.id);
  const pricing = eventPricing(event);
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012"}/e/${event.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) hover:text-foreground motion-reduce:transition-none">
        <ArrowLeft className="size-4" /> Events
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-medium tracking-tight truncate">{event.title}</h1>
            <Badge variant={event.status === "published" ? "success" : "secondary"}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{formatEventDateTime(event.starts_at, event.timezone)}</p>
          {pricing && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-foreground font-medium">
                {formatMoney(pricing.price, pricing.currency)}
              </span>
              {pricing.deposit != null && (
                <>
                  {", "}
                  {formatMoney(pricing.deposit, pricing.currency)} deposit,{" "}
                  {formatMoney(pricing.balanceAfterDeposit ?? 0, pricing.currency)} at the door
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="size-4" /> Edit</Link>
          </Button>
          {event.status === "published" ? (
            <form
              action={async () => {
                "use server";
                await unpublishEvent(event.id);
              }}
            >
              <Button type="submit" variant="outline">
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
              <Button type="submit">
                Publish
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Stat label="Confirmed" value={counts.yes} />
        <Stat label="Declined" value={counts.no} />
        <Stat label="Maybe" value={counts.maybe} />
        <Stat label="Pending" value={counts.pending} />
        <Stat label="Checked in" value={counts.checkedIn} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PrepListPanel eventId={event.id} list={prepList} />
        <section>
          <h2 className="nf-eyebrow">Public page</h2>
          <div className="nf-panel mt-4 p-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with anyone. They see the event page and (if they are a guest) an RSVP form.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs">{publicUrl}</code>
              <CopyButton value={publicUrl} />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/e/${event.slug}`} target="_blank">
                <ExternalLink className="size-4" /> Open public page
              </Link>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="nf-eyebrow">Quick actions</h2>
          <div className="nf-panel mt-4 p-6 space-y-2">
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
          </div>
        </section>
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
    <Card className="nf-panel">
      <CardContent className="p-5">
        <p className="font-display text-3xl font-medium tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
