import { notFound } from "next/navigation";
import { resolveInvite } from "@/lib/rsvp";
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { formatEventDateTime } from "@/lib/format";
import { eventPricing, formatMoney } from "@/lib/money";

type Params = { token: string };

export const metadata = { title: "RSVP", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const resolved = await resolveInvite(token);
  if (!resolved.ok) notFound();
  const pricing = eventPricing(resolved.event);
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
        {pricing && (
          <div className="mb-6 rounded-md border bg-card p-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Ticket</span>
              <span className="font-medium">{formatMoney(pricing.price, pricing.currency)}</span>
            </div>
            {pricing.deposit != null && (
              <div className="mt-2 pt-2 border-t flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Or secure your spot with</span>
                <span className="font-medium">
                  {formatMoney(pricing.deposit, pricing.currency)}
                </span>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {pricing.deposit != null
                ? `Paying the deposit leaves ${formatMoney(pricing.balanceAfterDeposit ?? 0, pricing.currency)} due at the door. The host will let you know how to pay.`
                : "The host will let you know how to pay."}
            </p>
          </div>
        )}
        <RsvpForm
          token={token}
          guestName={resolved.guest.name}
          customQuestion={resolved.event.custom_question}
          currentStatus={resolved.rsvpStatus}
          pricing={pricing}
        />
      </div>
    </main>
  );
}
