import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { resolveInvite } from "@/lib/rsvp";
import { guestPaymentState } from "@/lib/payments";
import { eventPricing, formatMoney } from "@/lib/money";
import { mintToken } from "@/lib/tokens";
import { generateQrDataUrl } from "@/lib/qr";
import { formatEventDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Clock } from "lucide-react";
import { PaymentWatcher } from "@/components/rsvp/payment-watcher";

type Params = { token: string };

export const metadata = { title: "Confirmed", robots: { index: false } };

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { token } = await params;
  const { reference } = await searchParams;
  const resolved = await resolveInvite(token);
  if (!resolved.ok) notFound();

  const pricing = eventPricing(resolved.event);
  const payment = await guestPaymentState(resolved.guest.id);

  // The QR is a working door pass, so it is only rendered once the spot is
  // genuinely secured. Holding the invite link is not enough.
  const confirmed = pricing ? payment.hasPaid : resolved.rsvpStatus === "yes";

  if (!confirmed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
        <div className="w-full max-w-md space-y-6">
          {reference && <PaymentWatcher reference={reference} />}
          <div className="text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-3">
              <Clock className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {reference ? "Waiting for your payment" : "Not confirmed yet"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {reference
                ? "If you paid by M-Pesa, approve the prompt on your phone. This page updates itself."
                : pricing
                  ? "Your spot is secured once payment goes through."
                  : "Send your RSVP to confirm your spot."}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/invite/${token}`}>Back to the invitation</Link>
          </Button>
        </div>
      </main>
    );
  }

  const balanceDue =
    pricing && !payment.paidInFull ? Math.max(0, pricing.price - payment.total) : 0;

  const checkinToken = mintToken({ kind: "checkin", guestId: resolved.guest.id, eventId: resolved.event.id });
  const qrDataUrl = await generateQrDataUrl(checkinToken);
  const icsUrl = `/api/invite/${token}/ics`;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-green-100 text-green-800 mb-3">
            <Check className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re confirmed</h1>
          <p className="text-sm text-muted-foreground mt-1">{resolved.event.title}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{formatEventDateTime(resolved.event.starts_at, resolved.event.timezone)}</p>
              {resolved.event.venue_name && (
                <p className="text-sm text-muted-foreground">
                  {resolved.event.venue_name}
                  {resolved.event.venue_address ? `, ${resolved.event.venue_address}` : ""}
                </p>
              )}
            </div>
            <div className="flex justify-center">
              <Image src={qrDataUrl} alt="Your QR code" width={220} height={220} className="rounded-md border" unoptimized />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Show this at the door for fast check-in.
            </p>
            {balanceDue > 0 && pricing && (
              <p className="text-center text-sm rounded-md bg-amber-50 text-amber-900 px-3 py-2">
                Balance of{" "}
                <strong>{formatMoney(balanceDue, pricing.currency)}</strong> due at the door.
              </p>
            )}
            <Button asChild variant="outline" className="w-full">
              <a href={icsUrl} download>
                <Calendar className="size-4" /> Add to calendar
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
