import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { updateOrganisationAction } from "@/lib/actions/cards";
import { CompanyForm } from "@/components/cards/company-form";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata = { title: "Branding" };

export default async function CompanySettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const org = await prisma.organisation.findFirst({
    where: { slug, owner_id: user.id },
  });
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/dashboard/companies/${org.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {org.name}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Branding</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes apply to every card in this company immediately.
      </p>

      <CompanyForm
        action={updateOrganisationAction}
        submitLabel="Save changes"
        initial={{
          id: org.id,
          name: org.name,
          legal_name: org.legal_name,
          website: org.website ?? "",
          website_label: org.website_label ?? "",
          logo_url: org.logo_url ?? "",
          tagline: org.tagline ?? "",
          brand_primary: org.brand_primary,
          brand_secondary: org.brand_secondary,
          brand_accent: org.brand_accent,
          brand_ink: org.brand_ink,
        }}
      />
    </div>
  );
}
