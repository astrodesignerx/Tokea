import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLiveForm, isFormAccepting } from "@/lib/forms/data";
import { parseFields } from "@/lib/forms/fields";
import { submitFormResponseAction } from "@/lib/actions/form-submit";
import { prisma } from "@/lib/db";
import { PublicForm, type BrandStyle } from "@/components/forms/public-form";
import { PRODUCT } from "@/lib/brand";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/** Public pages are never indexed; the link is for the people it is sent to. */
const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const live = await getLiveForm(slug);

  if (!live || live.form.status === "draft" || live.form.status === "archived") {
    return { title: "Form not found", robots: NOINDEX };
  }

  return {
    title: live.form.title,
    description: live.form.description ?? undefined,
    robots: NOINDEX,
  };
}

/**
 * Relative luminance, so the header and Send button pick white or the brand's
 * ink for their text rather than assuming a dark background.
 */
function inkFor(background: string, brandInk: string): string {
  const value = background.replace("#", "");
  const channel = (start: number) => {
    const part = parseInt(value.slice(start, start + 2), 16) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.45 ? brandInk : "#ffffff";
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug } = await params;
  const live = await getLiveForm(slug);

  // Drafts and archived forms have no public page at all.
  if (!live || live.form.status === "draft" || live.form.status === "archived") {
    notFound();
  }

  const { form, version, organisation } = live;
  const count = await prisma.formResponse.count({ where: { form_id: form.id } });
  const parsed = version ? parseFields(version.fields) : null;

  if (!version || !parsed || "error" in parsed || !isFormAccepting(form, count)) {
    return <ClosedPage title={form.title} organisation={organisation?.name ?? null} />;
  }

  const brand: BrandStyle | null = organisation
    ? {
        primary: organisation.brand_primary,
        ink: inkFor(organisation.brand_primary, organisation.brand_ink),
      }
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <header
        className={brand ? "" : "border-b bg-muted/30"}
        style={brand ? { backgroundColor: brand.primary, color: brand.ink } : undefined}
      >
        <div className="mx-auto flex max-w-xl items-start gap-3 px-4 pb-8 pt-10">
          {organisation?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- logos are remote or /public files, never worth the image pipeline
            <img
              src={organisation.logo_url}
              alt=""
              className="size-11 shrink-0 rounded-lg bg-white/90 object-contain p-1.5"
            />
          )}
          <div className="min-w-0">
            {organisation ? (
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                {organisation.name}
              </p>
            ) : (
              <p className="nf-eyebrow">{PRODUCT}</p>
            )}
            <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-balance sm:text-3xl">
              {form.title}
            </h1>
            {form.description && (
              <p
                className={
                  brand
                    ? "mt-2 text-sm leading-relaxed opacity-80"
                    : "mt-2 text-sm leading-relaxed text-muted-foreground"
                }
              >
                {form.description}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-10 pt-6">
        <div className="nf-panel p-5">
          <PublicForm
            action={submitFormResponseAction.bind(null, slug)}
            versionId={version.id}
            fields={parsed.fields}
            brand={brand}
          />
        </div>
      </main>

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        Made with NikoForm
      </footer>
    </div>
  );
}

function ClosedPage({ title, organisation }: { title: string; organisation: string | null }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
        <p className="nf-eyebrow">{organisation ?? PRODUCT}</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          This form is closed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {title} is no longer taking answers. If you were asked to fill it in,
          contact whoever sent you the link.
        </p>
        <p className="mt-10 text-xs text-muted-foreground">Made with NikoForm</p>
      </main>
    </div>
  );
}
