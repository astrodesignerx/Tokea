import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, IdCard, Plus } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PRODUCT } from "@/lib/brand";

export const metadata = { title: "Dashboard" };

/**
 * The services hub.
 *
 * Each tile carries a live count rather than a static description, so the page
 * answers "what do I have" and not just "what could I do". The counts are four
 * cheap aggregates, not full row fetches.
 *
 * Services that are not built yet are listed alongside the working ones and
 * marked as such. Hiding the roadmap would make the grid look complete when it
 * is deliberately not.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  const [companies, cards, scans, events] = await Promise.all([
    prisma.organisation.count({ where: { owner_id: user.id } }),
    prisma.contactCard.count({
      where: { organisation: { owner_id: user.id }, status: "active" },
    }),
    prisma.cardScan.count({
      where: { card: { organisation: { owner_id: user.id } } },
    }),
    prisma.event.count({ where: { owner_id: user.id } }),
  ]);

  const services = [
    {
      icon: IdCard,
      name: "Digital business cards",
      description:
        "A page per person with a permanent QR code. Edit the details as often as you like without reprinting.",
      stats: [
        { label: companies === 1 ? "company" : "companies", value: companies },
        { label: cards === 1 ? "card" : "cards", value: cards },
        { label: scans === 1 ? "scan" : "scans", value: scans },
      ],
      href: "/dashboard/companies",
      action: { label: "New company", href: "/dashboard/companies/new" },
    },
    {
      icon: CalendarCheck,
      name: "Events and RSVPs",
      description:
        "A public page per event, a magic link per guest, and QR check-in at the door.",
      stats: [{ label: events === 1 ? "event" : "events", value: events }],
      href: "/dashboard/events",
      action: { label: "New event", href: "/dashboard/events/new" },
    },
    {
      icon: BarChart3,
      name: "Analytics",
      description:
        "Every scan of every code, which links get used, and where the activity comes from.",
      stats: [{ label: scans === 1 ? "scan recorded" : "scans recorded", value: scans }],
      href: "/dashboard/analytics",
      action: null,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="nf-eyebrow">{PRODUCT}</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
        Your services
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything this account can hand to people, in one place.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ icon: Icon, name, description, stats, href, action }) => (
          <div key={name} className="nf-panel nf-panel-interactive flex flex-col p-6">
            <Icon className="size-5 text-brand" />
            <h2 className="mt-4 font-display text-lg font-medium">{name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>

            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {stats.map(({ label, value }) => (
                <div key={label}>
                  <dd className="font-display text-2xl font-medium tabular-nums">
                    {value}
                  </dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>

            {/* mt-auto keeps every tile's buttons on one line. */}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
              <Button asChild size="sm" variant="outline">
                <Link href={href}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              {action && (
                <Button asChild size="sm" variant="ghost">
                  <Link href={action.href}>
                    <Plus className="size-3.5" /> {action.label}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}

        {/*
          Named rather than hidden. An empty-looking grid would suggest the
          product is finished; it is not.
        */}
        <div className="nf-panel flex flex-col justify-center border-dashed bg-transparent p-6">
          <h2 className="font-display text-lg font-medium text-muted-foreground">
            More coming
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bulk import, print packs and contact exchange are next. Each one
            appears here when it lands.
          </p>
        </div>
      </div>
    </div>
  );
}
