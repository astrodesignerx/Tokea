import { notFound } from "next/navigation";
import Image from "next/image";
import { resolveInvite } from "@/lib/rsvp";
import { mintToken } from "@/lib/tokens";
import { generateQrDataUrl } from "@/lib/qr";
import { formatEventDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";

type Params = { token: string };

export const metadata = { title: "Confirmed", robots: { index: false } };

export default async function ConfirmationPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const resolved = await resolveInvite(token);
  if (!resolved.ok) notFound();

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
                  {resolved.event.venue_address ? ` · ${resolved.event.venue_address}` : ""}
                </p>
              )}
            </div>
            <div className="flex justify-center">
              <Image src={qrDataUrl} alt="Your QR code" width={220} height={220} className="rounded-md border" unoptimized />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Show this at the door for fast check-in.
            </p>
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
