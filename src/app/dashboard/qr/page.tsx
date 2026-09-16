import Link from "next/link";
import { Lock, Plus, QrCode } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { countArchivedQrCodes, listQrCodes } from "@/lib/qr-codes/data";
import { isExpired, qrPath } from "@/lib/qr-codes/links";
import { getCardsOrigin } from "@/lib/cards/links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";

export const metadata = { title: "QR codes" };

type PageProps = { searchParams: Promise<{ archived?: string }> };

function relative(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default async function QrCodesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const showArchived = (await searchParams).archived === "1";

  const [codes, archivedCount, origin] = await Promise.all([
    listQrCodes(user.id, { includeArchived: showArchived }),
    countArchivedQrCodes(user.id),
    getCardsOrigin(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="nf-eyebrow">Dynamic QR codes</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            QR codes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Print once, change where it goes whenever you like.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/qr/new">
            <Plus className="size-4" /> New QR code
          </Link>
        </Button>
      </div>

      {codes.length === 0 && !showArchived ? (
        <Card className="mt-12 border-dashed bg-transparent">
          <CardContent className="p-12 text-center">
            <QrCode className="mx-auto size-8 text-brand" />
            <h2 className="mt-4 font-display text-lg font-medium">No QR codes yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Menus, posters, packaging: anything printed that should stay current.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/qr/new">Create your first QR code</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="nf-panel mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Points at</th>
                  <th className="px-5 py-3 text-right font-medium">Scans</th>
                  <th className="px-5 py-3 font-medium">Last scan</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {codes.map((code) => (
                  <tr key={code.id} className="align-middle transition-colors duration-200 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/qr/${code.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {code.name}
                      </Link>
                      {code.status !== "active" && (
                        <Badge variant="secondary" className="ml-2 capitalize">
                          {code.status}
                        </Badge>
                      )}
                      {isExpired(code) && (
                        <Badge variant="secondary" className="ml-2">
                          Expired
                        </Badge>
                      )}
                      {code.password_hash && (
                        <Lock
                          className="ml-2 inline size-3.5 text-muted-foreground"
                          aria-label="Password protected"
                        />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-brand">
                        {qrPath(code.short_code)}
                      </span>
                    </td>
                    <td className="max-w-[18rem] px-5 py-3">
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {code.destination}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{code.scans}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {code.lastScan ? relative(code.lastScan) : "never"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <CopyButton value={`${origin}${qrPath(code.short_code)}`} />
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/qr/${code.id}`}>Edit</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      Nothing here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {archivedCount > 0 && (
        <p className="mt-4 text-sm">
          <Link
            href={showArchived ? "/dashboard/qr" : "/dashboard/qr?archived=1"}
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
          </Link>
        </p>
      )}
    </div>
  );
}
