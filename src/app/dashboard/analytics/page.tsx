import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { getAnalytics } from "@/lib/cards/analytics";
import { getCardsOrigin, shortPath } from "@/lib/cards/links";
import { ScanChart } from "@/components/dashboard/scan-chart";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Analytics" };

function relative(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const { totals, daily, links, recentScans } = await getAnalytics(user.id);
  const origin = await getCardsOrigin();

  const stats = [
    { label: "Scans, all time", value: totals.totalScans },
    { label: "Last 7 days", value: totals.recentScanCount },
    { label: "Active cards", value: totals.activeCards },
    { label: "Companies", value: totals.companies },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="nf-eyebrow">Activity</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
        Analytics
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every scan of every code, and where each link currently points.
      </p>

      {/* Headline numbers. Four counts do not need a chart between them. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="nf-panel p-5">
            <p className="font-display text-3xl font-medium tabular-nums">
              {value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="nf-panel mt-5 p-6">
        <ScanChart data={daily} />
      </section>

      <section className="mt-10">
        <h2 className="nf-eyebrow">Links and codes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The short code is permanent. The destination is not, and can be
          changed from the card&rsquo;s edit page without reprinting anything.
        </p>

        {links.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No cards yet, so there is nothing to measure.
          </p>
        ) : (
          <div className="nf-panel mt-5 overflow-hidden">
            {/* The table scrolls inside its own box rather than the page. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Person</th>
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Points at</th>
                    <th className="px-5 py-3 text-right font-medium">Scans</th>
                    <th className="px-5 py-3 font-medium">Last scan</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {links.map((row) => (
                    <tr key={row.cardId} className="align-middle">
                      <td className="px-5 py-3">
                        <span className="font-medium">{row.name}</span>
                        {row.status === "archived" && (
                          <Badge variant="secondary" className="ml-2">
                            Archived
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.company}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-brand">
                          /s/{row.shortCode}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.destination}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {row.scans}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.lastScan ? relative(row.lastScan) : "never"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <CopyButton value={`${origin}${shortPath(row.shortCode)}`} />
                          <Link
                            href={`/dashboard/companies/${row.companySlug}/cards/${row.cardId}`}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={`Edit ${row.name}`}
                          >
                            <ExternalLink className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="nf-eyebrow">Recent scans</h2>
        {recentScans.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing yet. Scans appear here as soon as someone opens a code.
          </p>
        ) : (
          <ul className="nf-panel mt-5 divide-y text-sm">
            {recentScans.map((scan) => (
              <li
                key={scan.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span>
                  <span className="font-medium">{scan.cardName}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    /s/{scan.shortCode}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {scan.country && (
                    <span className="font-mono text-xs">{scan.country}</span>
                  )}
                  <time dateTime={scan.scannedAt.toISOString()}>
                    {relative(scan.scannedAt)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
