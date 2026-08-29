import Link from "next/link";
import { Plus, IdCard } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyGrid } from "@/components/cards/company-grid";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const user = await requireUser();

  const organisations = await prisma.organisation.findMany({
    where: { owner_id: user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { cards: true } },
    },
  });

  const companies = organisations.map((org) => ({
    slug: org.slug,
    name: org.name,
    tagline: org.tagline,
    logoUrl: org.logo_url,
    primary: org.brand_primary,
    accent: org.brand_accent,
    cardCount: org._count.cards,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="nf-eyebrow">Digital business cards</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            Companies
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companies.length === 0
              ? "Add a company to start building its digital cards."
              : `${companies.length} compan${companies.length === 1 ? "y" : "ies"}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/companies/new">
            <Plus className="size-4" /> New company
          </Link>
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card className="mt-12 border-dashed bg-transparent">
          <CardContent className="p-12 text-center">
            <IdCard className="mx-auto size-8 text-brand" />
            <h2 className="mt-4 font-display text-lg font-medium">No companies yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each company holds its own branding and its team&rsquo;s cards.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/companies/new">Add your first company</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CompanyGrid companies={companies} />
      )}
    </div>
  );
}
