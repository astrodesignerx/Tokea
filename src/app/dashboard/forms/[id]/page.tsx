import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, QrCode } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import {
  findOwnedForm,
  getResponseSummary,
  listResponses,
  listVersions,
} from "@/lib/forms/data";
import { parseFields } from "@/lib/forms/fields";
import {
  createFormQrAction,
  publishFormAction,
  saveFormDraftAction,
  updateFormSettingsAction,
} from "@/lib/actions/forms";
import { getCardsOrigin } from "@/lib/cards/links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormBuilder } from "@/components/forms/form-builder";
import { ResponseSummary } from "@/components/forms/response-summary";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export const metadata = { title: "Form" };

function statusBadge(form: { status: string; live_version: number | null }): string {
  if (form.status === "archived") return "Archived";
  if (form.live_version === null) return "Draft";
  if (form.status === "closed") return "Closed";
  return `Live, version ${form.live_version}`;
}

export default async function FormPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const search = await searchParams;

  const form = await findOwnedForm(id, user.id);
  if (!form) notFound();

  const tab = search.tab === "responses" || search.tab === "share" ? search.tab : "build";
  const page = Number(search.page) > 0 ? Math.floor(Number(search.page)) : 1;

  const [versions, responseCount, organisations, origin] = await Promise.all([
    listVersions(form.id),
    prisma.formResponse.count({ where: { form_id: form.id } }),
    prisma.organisation.findMany({
      where: { owner_id: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getCardsOrigin(),
  ]);

  const liveVersion = versions.find((version) => version.number === form.live_version) ?? null;
  const draft = parseFields(form.draft_fields);
  const draftFields = "error" in draft ? [] : draft.fields;
  const liveParsed = liveVersion ? parseFields(liveVersion.fields) : null;
  const liveFields = liveParsed && !("error" in liveParsed) ? liveParsed.fields : null;

  const responsesData = tab === "responses" ? await listResponses(form.id, page) : null;
  const summary = tab === "responses" ? await getResponseSummary(form.id) : null;

  const publicUrl = `${origin}/f/${form.slug}`;
  const tabs = [
    { key: "build", label: "Build" },
    { key: "responses", label: `Responses ${responseCount}` },
    { key: "share", label: "Share" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/dashboard/forms"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Forms
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">{form.title}</h1>
        <Badge variant={form.status === "open" ? "success" : "secondary"} className="whitespace-nowrap">
          {statusBadge(form)}
        </Badge>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto whitespace-nowrap border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Link
              key={item.key}
              href={`/dashboard/forms/${form.id}?tab=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-2 text-sm transition-colors duration-200",
                "after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-brand",
                "after:transition-transform after:duration-200 after:ease-[cubic-bezier(0,0,0.2,1)]",
                active
                  ? "text-foreground after:scale-x-100"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {tab === "build" && (
        <FormBuilder
          formId={form.id}
          initialFields={draftFields}
          liveFields={liveFields}
          liveVersion={form.live_version}
          settings={{
            title: form.title,
            description: form.description ?? "",
            organisationId: form.organisation_id ?? "",
            closesAt: form.closes_at?.toISOString() ?? null,
            responseLimit: form.response_limit?.toString() ?? "",
            notifyEmails: form.notify_emails.join("\n"),
            thankYou: form.thank_you ?? "",
            status: form.status,
          }}
          organisations={organisations}
          saveAction={saveFormDraftAction}
          publishAction={publishFormAction}
          settingsAction={updateFormSettingsAction}
        />
      )}

      {tab === "responses" && responsesData && summary && (
        <ResponseSummary
          formId={form.id}
          versions={versions.map((version) => ({
            id: version.id,
            number: version.number,
            fields: version.fields,
          }))}
          responses={responsesData.responses.map((response) => ({
            id: response.id,
            version_id: response.version_id,
            answers: response.answers,
            submitted_at: response.submitted_at.toISOString(),
          }))}
          summary={summary}
          page={responsesData.page}
          pages={responsesData.pages}
          total={responsesData.total}
        />
      )}

      {tab === "share" && (
        <div className="mt-6 max-w-2xl">
          <div className="nf-panel p-6">
            <p className="nf-eyebrow">Public link</p>
            <div className="mt-3 flex items-center gap-1">
              <span className="min-w-0 truncate font-mono text-sm text-brand">{publicUrl}</span>
              <CopyButton value={publicUrl} />
              <Button asChild variant="ghost" size="icon" aria-label="Open the form">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {form.live_version === null
                ? "This link starts working once you publish the form."
                : form.status === "open"
                  ? "Anyone with this link can fill it in. It is never indexed by search engines."
                  : "The link is closed right now, so visitors see a short closed page."}
            </p>

            <form action={createFormQrAction} className="mt-6">
              <input type="hidden" name="form_id" value={form.id} />
              <Button type="submit" variant="outline">
                <QrCode className="size-4" />
                {form.qr_code_id ? "Open its QR code" : "Make a QR code"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              The QR code is dynamic, so it keeps pointing at this form. Download
              it for print from the QR dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
