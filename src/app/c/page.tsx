import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { BrandCorner } from "@/components/cards/brand-corner";
import { fullName, listCards, listOrganisations } from "@/lib/cards/data";
import { cardQrDataUrl } from "@/lib/cards/qr";
import { cardPath, shortUrl } from "@/lib/cards/links";

export const metadata: Metadata = {
  // absolute, so Tokea's "%s | Tokea" template does not brand client pages.
  title: { absolute: "Digital cards" },
  description: "Digital business cards.",
};

/**
 * Public directory of every card, grouped by organisation. Phase 2 moves this
 * behind auth as /dashboard/companies and adds search; the public shape stays
 * useful as a per-company team page.
 */
export default async function CardsIndexPage() {
  const organisations = await listOrganisations();

  const sections = await Promise.all(
    organisations.map(async (org) => {
      const cards = await listCards({ organisationSlug: org.slug });
      const entries = await Promise.all(
        cards
          .filter((card) => card.status === "active")
          .map(async (card) => {
            const url = await shortUrl(card.shortCode);
            return { card, url, qr: await cardQrDataUrl(url, 240) };
          })
      );
      return { org, entries };
    })
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
      {sections.map(({ org, entries }) => (
        <section key={org.slug} className="mb-12 last:mb-0">
          <header className="relative mb-6 overflow-hidden rounded-[var(--card-radius)] bg-[var(--card-paper)] shadow-sm">
            <BrandCorner className="absolute left-0 top-0 h-full w-auto" />
            <div className="relative py-8 pl-24 pr-6 sm:pl-28">
              <Image
                src={org.logo}
                alt={org.logoAlt}
                width={1346}
                height={261}
                priority
                className="h-7 w-auto"
              />
              <h1
                className="mt-5 text-2xl text-black"
                style={{ fontFamily: "var(--font-card-serif), ui-serif, Georgia, serif" }}
              >
                Digital cards
              </h1>
              <p className="mt-1 text-sm text-[var(--brand-ink-soft)]">
                One page per person. Share the link, or print the QR code.
              </p>
            </div>
          </header>

          <ul className="grid gap-4 sm:grid-cols-2">
            {entries.map(({ card, url, qr }, index) => (
              <li
                key={card.slug}
                className="animate-rise"
                /* Stagger the tiles so the grid arrives in sequence. */
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="h-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-paper)] p-5 transition-[border-color,box-shadow,transform] duration-[var(--card-duration-base)] ease-[var(--card-ease-out)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-teal)_40%,transparent)] hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qr}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg border border-[var(--card-border)]"
                    />
                    <div className="min-w-0">
                      <h2
                        className="text-lg leading-tight text-black"
                        style={{ fontFamily: "var(--font-card-serif), ui-serif, Georgia, serif" }}
                      >
                        {fullName(card)}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold leading-snug text-[var(--brand-coral)]">
                        {card.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--brand-ink-soft)]">
                        {card.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[var(--card-border)] pt-3">
                    <div className="flex items-center gap-3 text-xs">
                      <Link
                        href={cardPath(card.slug)}
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium text-[var(--brand-teal)] transition-transform duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)] hover:translate-x-0.5"
                      >
                        Open card
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <a
                        href={`/api/cards/${card.slug}/qr?size=2048`}
                        download={`${card.slug}-qr.png`}
                        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium text-[var(--brand-ink-soft)] transition-colors duration-[var(--card-duration-fast)] hover:text-[var(--brand-ink)]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        QR (2048px)
                      </a>
                    </div>
                    <p className="mt-2 truncate font-mono text-[0.6875rem] text-[var(--brand-ink-soft)]">
                      {url.replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
