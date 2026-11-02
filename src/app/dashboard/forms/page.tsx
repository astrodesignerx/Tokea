import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { countArchivedForms, listForms } from "@/lib/forms/data";
import { getCardsOrigin } from "@/lib/cards/links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";

export const metadata = { title: "Forms" };

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

function statusLabel(form: { status: string; live_version: number | null }): string {
  if (form.status === "archived") return "Archived";
  if (form.live_version === null) return "Draft";
  if (form.status === "closed") return "Closed";
  return "Live";
}

export default async function FormsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const showArchived = (await searchParams).archived === "1";

  const [forms, archivedCount, origin] = await Promise.all([
    listForms(user.id, { includeArchived: showArchived }),
    countArchivedForms(user.id),
    getCardsOrigin(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="nf-eyebrow">Forms</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask once, read every answer in one table.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/forms/new">
            <Plus className="size-4" /> New form
          </Link>
        </Button>
      </div>

      {forms.length === 0 && !showArchived ? (
        <Card className="mt-12 border-dashed bg-transparent">
          <CardContent className="p-12 text-center">
            <ClipboardList className="mx-auto size-8 text-brand" />
            <h2 className="mt-4 font-display text-lg font-medium">No forms yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Feedback, orders, sign-ups: build it once, then share the link or a
              QR code.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/forms/new">Create your first form</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="nf-panel mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Responses</th>
                  <th className="px-5 py-3 font-medium">Last response</th>
                  <th className="px-5 py-3 font-medium">Public link</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {forms.map((form) => {
                  const published = form.live_version !== null;
                  return (
                    <tr
                      key={form.id}
                      className="align-middle transition-colors duration-200 hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/forms/${form.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {form.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={form.status === "open" ? "success" : "secondary"}
                          className="whitespace-nowrap"
                        >
                          {statusLabel(form)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{form.responses}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {form.lastResponse ? relative(form.lastResponse) : "never"}
                      </td>
                      <td className="px-5 py-3">
                        {published ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-brand">/f/{form.slug}</span>
                            <CopyButton value={`${origin}/f/${form.slug}`} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not published</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/forms/${form.id}`}>Open</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {forms.length === 0 && (
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
            href={showArchived ? "/dashboard/forms" : "/dashboard/forms?archived=1"}
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
          </Link>
        </p>
      )}
    </div>
  );
}
