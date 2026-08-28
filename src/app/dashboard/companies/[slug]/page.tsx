import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Plus, Settings2 } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { countScans, fullName } from "@/lib/cards/data";
import { cardPath, shortPath, getCardsOrigin } from "@/lib/cards/links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoPlate } from "@/components/cards/logo-plate";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const org = await prisma.organisation.findUnique({ where: { slug } });
  return { title: org?.name ?? "Company" };
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const org = await prisma.organisation.findFirst({
    where: { slug, owner_id: user.id },
    include: { cards: { orderBy: [{ last_name: "asc" }, { first_name: "asc" }] } },
  });
  if (!org) notFound();

  const scans = await countScans(org.cards.map((card) => card.id));
  const origin = await getCardsOrigin();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard/companies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Companies
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {org.logo_url && (
              <LogoPlate src={org.logo_url} name={org.name} className="h-9" />
            )}
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {org.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {org.cards.length} card{org.cards.length === 1 ? "" : "s"}
            {org.website && `, ${org.website_label ?? org.website}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/companies/${org.slug}/settings`}>
              <Settings2 className="size-4" /> Branding
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/companies/${org.slug}/cards/new`}>
              <Plus className="size-4" /> New card
            </Link>
          </Button>
        </div>
      </div>

      {org.cards.length === 0 ? (
        <Card className="mt-10 border-dashed">
          <CardContent className="p-12 text-center">
            <h2 className="text-lg font-medium">No cards yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add someone and they get a page, a vCard and a permanent QR code.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/dashboard/companies/${org.slug}/cards/new`}>
                Add the first card
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {org.cards.map((card) => {
            const permanent = `${origin}${shortPath(card.short_code)}`;
            return (
              <Card key={card.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{fullName(card)}</h2>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {card.title}
                      </p>
                    </div>
                    {card.status === "archived" && (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </div>

                  <p className="mt-3 truncate text-xs text-muted-foreground">
                    {card.email}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      /s/{card.short_code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {scans.get(card.id) ?? 0} scan
                      {(scans.get(card.id) ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/dashboard/companies/${org.slug}/cards/${card.id}`}
                      >
                        Edit
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={cardPath(card.slug)} target="_blank">
                        <ExternalLink className="size-3.5" /> View
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a
                        href={`/api/cards/${card.slug}/qr?size=2048`}
                        download={`${card.slug}-qr.png`}
                      >
                        <Download className="size-3.5" /> QR
                      </a>
                    </Button>
                    <span className="ml-auto" title="Copy permanent link">
                      <CopyButton value={permanent} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
