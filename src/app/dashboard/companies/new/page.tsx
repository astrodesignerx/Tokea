import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { createOrganisationAction } from "@/lib/actions/cards";
import { CompanyForm } from "@/components/cards/company-form";

export const metadata = { title: "New company" };

export default async function NewCompanyPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard/companies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Companies
      </Link>

      <p className="nf-eyebrow mt-6">Digital business cards</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
        New company
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set the branding once. Every card in this company inherits it.
      </p>

      <CompanyForm
        action={createOrganisationAction}
        submitLabel="Create company"
        initial={{
          name: "",
          legal_name: "",
          website: "",
          website_label: "",
          logo_url: "",
          cover_image_url: "",
          tagline: "",
          brand_primary: "#1DB8AF",
          brand_secondary: "#87CFC8",
          brand_accent: "#F1666B",
          brand_ink: "#464F58",
        }}
      />
    </div>
  );
}
