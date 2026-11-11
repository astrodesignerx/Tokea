import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { fileSize, isBot, type PageKind } from "@/lib/pages/rules";
import { isPagesStorageConfigured, presignView } from "@/lib/pages/storage";
import { FileViewer, NikoFormPill } from "@/components/pages/file-viewer";
import { PageIcon } from "@/components/pages/page-icon";
import { Button } from "@/components/ui/button";
import "@/components/pages/pages.css";

export const dynamic = "force-dynamic";

const publicPage = cache((code: string) => prisma.page.findFirst({
  where: { short_code: code, is_live: true, deleted_at: null, blocked_at: null, current_file: { confirmed_at: { not: null } } },
  include: { current_file: true },
}));

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const page = await publicPage((await params).code);
  return { title: { absolute: page?.title ?? "Page unavailable" }, robots: { index: false, follow: false } };
}

export default async function PublicPage({ params }: { params: Promise<{ code: string }> }) {
  const page = await publicPage((await params).code);
  if (!page?.current_file) notFound();
  const file = page.current_file;
  if (!isPagesStorageConfigured()) return <main className="grid h-[100dvh] place-items-center p-6"><p className="text-center text-sm text-muted-foreground">This file is temporarily unavailable. Please try again later.</p></main>;
  const [url, downloadUrl, session, headerList] = await Promise.all([
    presignView(file.key, file.mime, file.file_name, "inline"),
    presignView(file.key, file.mime, file.file_name, "attachment"),
    auth(), headers(),
  ]);
  if (!isBot(headerList.get("user-agent")) && session?.user?.id !== page.owner_id) {
    await prisma.page.updateMany({ where: { id: page.id, is_live: true, deleted_at: null, blocked_at: null, current_file_id: file.id }, data: { view_count: { increment: 1 }, last_viewed_at: new Date() } });
  }
  return <main className="pages-ui pages-viewer fixed inset-0 h-[100dvh] w-full overflow-hidden bg-background">
    {file.kind === "office" ? <div className="grid h-full overflow-auto p-5"><div className="nf-panel m-auto w-full max-w-md p-6 text-center sm:p-8">
      <div className="mx-auto grid size-14 place-items-center rounded-xl bg-muted"><PageIcon kind="office" className="size-7 text-muted-foreground" /></div>
      <h1 className="mt-5 break-words text-xl font-medium [overflow-wrap:anywhere]">{page.title}</h1><p className="mt-2 break-all text-sm text-muted-foreground">{file.file_name}</p><p className="mt-1 text-xs text-muted-foreground">{fileSize(file.size)}</p>
      <Button asChild className="mt-6"><a href={downloadUrl}><Download className="size-4" />Download file</a></Button>
      <p className="mt-5 text-sm text-muted-foreground">This file type downloads to open. Ask the sender for a PDF to view it in the browser.</p>
    </div></div> : <FileViewer kind={file.kind as PageKind} url={url} downloadUrl={downloadUrl} title={page.title} />}
    {page.show_badge && file.kind !== "office" && <NikoFormPill />}
  </main>;
}
