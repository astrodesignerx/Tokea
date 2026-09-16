import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Link not available" },
  robots: { index: false },
};

/**
 * Where an unknown, paused or archived QR code lands. Whoever arrives here
 * scanned something printed in good faith, so this explains instead of 404ing.
 */
export default function QrUnavailablePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div className="qr-rise max-w-sm">
        <h1 className="text-xl font-medium text-foreground">
          This link is not available right now
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The code you scanned has been paused or retired by whoever printed it.
          Try again later, or contact them directly.
        </p>
      </div>
    </main>
  );
}
