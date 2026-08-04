import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { listEventsByOwner } from "@/lib/queries/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEventDateTime } from "@/lib/format";
import { Plus } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const events = await listEventsByOwner(user.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {events.length === 0
              ? "Create your first event to get started."
              : `${events.length} event${events.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="size-4" /> New event
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-medium">No events yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Create one and you can invite guests in minutes.</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/events/new">Create your first event</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                {event.cover_image_url && (
                  <div
                    className="h-32 bg-cover bg-center"
                    style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  />
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatEventDateTime(event.starts_at, "UTC")}
                      </p>
                    </div>
                    <Badge variant={event.status === "published" ? "success" : "muted"}>
                      {event.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
