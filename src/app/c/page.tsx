import type { Metadata } from "next";

export const metadata: Metadata = {
  // absolute, so Tokea's "%s | Tokea" template does not brand a client page.
  title: { absolute: "Card not available" },
  robots: { index: false },
};

/**
 * Where an unknown or retired short code lands.
 *
 * Deliberately not a directory of every card: cards belong to different client
 * organisations, and one client's team must never be browsable from another's
 * link. The per-company grid lives behind auth at /dashboard/companies.
 *
 * Whoever arrives here scanned something that was valid once, so this explains
 * rather than 404s at them.
 */
export default function CardUnavailablePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="animate-rise max-w-sm">
        <h1 className="text-xl font-medium text-[var(--brand-ink)]">
          This card is no longer available
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--brand-ink-soft)]">
          The link may have been retired, or the person may have moved on. If
          someone gave you this card, try contacting them directly.
        </p>
      </div>
    </main>
  );
}
