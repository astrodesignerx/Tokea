import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { getCardsOrigin } from "@/lib/cards/links";
import { generateQrDataUrl } from "@/lib/qr";
import { fileSize } from "@/lib/pages/rules";
import { isPagesStorageConfigured } from "@/lib/pages/storage";
import { PageIcon } from "@/components/pages/page-icon";
import { CopyPageLink } from "@/components/pages/copy-link";
import { PageControls } from "@/components/pages/page-controls";
import { UploadFile } from "@/components/pages/upload-file";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Share page" };

export default async function PageDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const page = await prisma.page.findFirst({ where: { id, owner_id: user.id, deleted_at: null }, include: { current_file: true } });
  if (!page) notFound();
  const url = `${await getCardsOrigin()}/p/${page.short_code}`;
  const qr = await generateQrDataUrl(url);
  const file = page.current_file;
  const configured = isPagesStorageConfigured();
  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
    <Link href="/dashboard/pages" className="inline-flex min-h-11 items-center text-sm text-muted-foreground">Back to Pages</Link>
    <div className="mt-3 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section className="pages-enter nf-panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><PageIcon kind={file?.kind ?? ""} /></span><div className="min-w-0"><h1 className="break-words text-2xl font-medium [overflow-wrap:anywhere]">{page.title}</h1><p className="mt-2 text-sm text-muted-foreground">{page.blocked_at ? "This page has been blocked and is unavailable to clients." : page.is_live ? "Ready to share with your client." : "The link is off. Turn it on when you are ready."}</p></div></div>
        <dl className="mt-7 grid grid-cols-2 gap-5 text-sm"><div><dt className="text-muted-foreground">Views</dt><dd className="mt-1 text-2xl font-medium tabular-nums">{page.view_count.toLocaleString("en-GB")}</dd></div><div><dt className="text-muted-foreground">Current file</dt><dd className="mt-1 uppercase">{file?.kind ?? "Not ready"}</dd></div></dl>
        {file && <div className="mt-6 border-t pt-5"><p className="break-all text-sm font-medium">{file.file_name}</p><p className="mt-1 text-xs text-muted-foreground">{fileSize(file.size)}, updated {file.created_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p></div>}
        {!configured && <p role="status" className="mt-5 text-sm text-muted-foreground">Pages storage is not configured. Uploads and file viewing are unavailable.</p>}
        <div className="mt-6"><UploadFile pageId={page.id} disabled={!configured} /></div>
      </section>
      <aside className="pages-enter pages-follow nf-panel min-w-0 p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-medium">Share page</h2><label htmlFor="client-link" className="mt-4 block text-sm font-medium">Client link</label>
        <div className="mt-2 flex min-w-0 gap-2"><input id="client-link" readOnly value={url} className="min-w-0 flex-1 rounded-md border bg-muted px-3 text-xs" /><CopyPageLink url={url} /></div>
        <PageControls id={page.id} title={page.title} live={page.is_live} badge={page.show_badge} />
        <div className="mt-5 flex items-center gap-4 border-t pt-5"><Image src={qr} alt="QR code for this page" width={88} height={88} unoptimized className="shrink-0 rounded-md bg-white" /><div className="min-w-0"><p className="text-sm font-medium">QR code</p><p className="mt-1 text-xs text-muted-foreground">For decks and print.</p><Button asChild variant="outline" size="sm" className="mt-2"><a href={qr} download={`${page.short_code}-qr.png`}>Download PNG</a></Button></div></div>
        <Button asChild variant="outline" className="mt-5 w-full"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open as client</a></Button>
      </aside>
    </div>
  </div>;
}
