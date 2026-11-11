import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { getCardsOrigin } from "@/lib/cards/links";
import { isPagesStorageConfigured } from "@/lib/pages/storage";
import { PageIcon } from "@/components/pages/page-icon";
import { UploadFile } from "@/components/pages/upload-file";
import { CopyPageLink } from "@/components/pages/copy-link";

export const metadata = { title: "Pages" };

export default async function PagesPage() {
  const user = await requireUser();
  const [pages, origin] = await Promise.all([
    prisma.page.findMany({ where: { owner_id: user.id, deleted_at: null, current_file: { confirmed_at: { not: null } } }, include: { current_file: true }, orderBy: { created_at: "desc" } }),
    getCardsOrigin(),
  ]);
  const configured = isPagesStorageConfigured();
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <p className="nf-eyebrow">Your services</p><h1 className="mt-3 text-3xl font-medium">Pages</h1>
    <p className="mt-2 text-sm text-muted-foreground">Upload a file and share a full-screen page with a permanent link.</p>
    {!configured && <p role="status" className="mt-6 rounded-lg border bg-muted p-4 text-sm">Pages storage is not configured yet. Uploads and file viewing will be available once private storage is connected.</p>}
    <div className="pages-enter mt-8"><UploadFile disabled={!configured} /></div>
    <section className="pages-enter pages-follow mt-8" aria-label="Your pages">
      {pages.length ? <ul className="overflow-hidden rounded-xl border bg-card">{pages.map((page) => <li key={page.id} className="flex min-w-0 items-center gap-3 border-b p-4 last:border-0 sm:gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><PageIcon kind={page.current_file!.kind} /></span>
        <div className="min-w-0 flex-1"><Link href={`/dashboard/pages/${page.id}`} className="block truncate text-sm font-medium hover:underline">{page.title}</Link><p className="mt-1 truncate font-mono text-xs text-muted-foreground">/p/{page.short_code}</p><p className="mt-1 text-xs text-muted-foreground">Updated {page.updated_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, {page.view_count.toLocaleString("en-GB")} {page.view_count === 1 ? "view" : "views"}</p></div>
        <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-3"><span className={`rounded-full px-2.5 py-1 text-xs ${page.is_live && !page.blocked_at ? "bg-primary/10 text-brand" : "bg-muted text-muted-foreground"}`}>{page.blocked_at ? "Blocked" : page.is_live ? "Live" : "Off"}</span><CopyPageLink url={`${origin}/p/${page.short_code}`} compact /></div>
      </li>)}</ul> : <div className="nf-panel p-8 text-center"><h2 className="text-base font-medium">Your first page starts with a file</h2><p className="mt-2 text-sm text-muted-foreground">Upload a proposal, portfolio, deck or video, then send its link or QR code to your client.</p></div>}
    </section>
  </div>;
}
