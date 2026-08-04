import { notFound } from "next/navigation";
import { resolveInvite } from "@/lib/rsvp";
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { formatEventDateTime } from "@/lib/format";

type Params = { token: string };

export const metadata = { title: "RSVP", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const resolved = await resolveInvite(token);
  if (!resolved.ok) notFound();
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">You&apos;re invited to</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">{resolved.event.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {formatEventDateTime(resolved.event.starts_at, resolved.event.timezone)}
          </p>
          {resolved.event.venue_name && (
            <p className="text-sm text-muted-foreground">
              {resolved.event.venue_name}
              {resolved.event.venue_address ? ` · ${resolved.event.venue_address}` : ""}
            </p>
          )}
        </div>
        <RsvpForm
          token={token}
          guestName={resolved.guest.name}
          customQuestion={resolved.event.custom_question}
          currentStatus={resolved.rsvpStatus}
        />
      </div>
    </main>
  );
}
