import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { allocateShortCode } from "@/lib/short-code-allocator";
import { checkPageQuota, lockPageOwner, PageError } from "@/lib/pages/access";
import { fileKind, sizeProblem } from "@/lib/pages/rules";
import { deleteObjects, headMatches, isPagesStorageConfigured, presignPut } from "@/lib/pages/storage";

const bodySchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("prepare"), name: z.string().trim().min(1).max(255).regex(/^[^\x00-\x1f\x7f/\\]+$/), size: z.number().int().positive(), pageId: z.string().min(1).max(100).optional() }).strict(),
  z.object({ operation: z.literal("confirm"), pageId: z.string().min(1).max(100), fileId: z.string().min(1).max(100) }).strict(),
]);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isPagesStorageConfigured()) return json({ error: "Pages storage is not configured. Please try again later." }, 503);
  // The endpoint accepts metadata only; file bytes go straight to R2.
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Upload metadata is too large." }, 413);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the file details and try again." }, 400);
  const input = parsed.data;
  try {
    if (input.operation === "prepare") {
      const type = fileKind(input.name);
      if (!type) return json({ error: "This file type is not supported yet." }, 400);
      const problem = sizeProblem(type.kind, input.size);
      if (problem) return json({ error: problem }, 400);
      const result = await prisma.$transaction(async (tx) => {
        await lockPageOwner(tx, user.id);
        const stale = await tx.pageFile.findMany({ where: { page: { owner_id: user.id }, confirmed_at: null, created_at: { lt: new Date(Date.now() - 3600000) } }, select: { id: true, key: true, page_id: true } });
        await deleteObjects(stale.map((file) => file.key));
        await tx.pageFile.deleteMany({ where: { id: { in: stale.map((file) => file.id) }, page: { owner_id: user.id }, confirmed_at: null } });
        // Keep abandoned codes reserved just like explicitly deleted pages.
        await tx.page.updateMany({ where: { id: { in: stale.map((file) => file.page_id) }, owner_id: user.id, deleted_at: null, current_file_id: null, files: { none: {} } }, data: { deleted_at: new Date(), is_live: false } });
        let pageId = input.pageId;
        if (pageId) {
          const page = await tx.page.findFirst({ where: { id: pageId, owner_id: user.id, deleted_at: null } });
          if (!page) throw new PageError("Page not found.", 404);
        }
        await checkPageQuota(tx, user.id, input.size, pageId);
        if (!pageId) {
          const title = input.name.replace(/\.[^.]+$/, "").trim().slice(0, 120) || "Untitled page";
          const page = await tx.page.create({ data: { owner_id: user.id, short_code: await allocateShortCode(), title } });
          pageId = page.id;
        }
        const key = `pages/${randomUUID()}`;
        const signed = await presignPut(key, type.mime, input.size);
        const file = await tx.pageFile.create({ data: { page_id: pageId, key, file_name: input.name, size: input.size, ...type } });
        return { pageId, fileId: file.id, ...signed };
      }, { timeout: 30000 });
      return json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockPageOwner(tx, user.id);
      const page = await tx.page.findFirst({ where: { id: input.pageId, owner_id: user.id, deleted_at: null }, include: { current_file: true } });
      if (!page) throw new PageError("Page not found.", 404);
      const file = await tx.pageFile.findFirst({ where: { id: input.fileId, page_id: page.id, confirmed_at: null, page: { owner_id: user.id, deleted_at: null } } });
      if (!file) throw new PageError("Upload not found or already confirmed.", 404);
      if (!(await headMatches(file.key, file.mime, file.size))) throw new PageError("The uploaded file does not match. Choose the file and try again.");
      await checkPageQuota(tx, user.id, file.size, page.id);
      await tx.pageFile.update({ where: { id: file.id, page: { owner_id: user.id } }, data: { confirmed_at: new Date() } });
      await tx.page.update({ where: { id: page.id, owner_id: user.id, deleted_at: null }, data: { current_file_id: file.id } });
      return { pageId: page.id, shortCode: page.short_code, previous: page.current_file };
    }, { timeout: 30000 });
    if (result.previous) {
      try {
        await deleteObjects([result.previous.key]);
        await prisma.pageFile.deleteMany({ where: { id: result.previous.id, page: { owner_id: user.id }, current_of: null } });
      } catch {
        // The replacement is ready; retain the old row so failed cleanup is recoverable.
        console.error("[pages] Previous file cleanup failed.");
      }
    }
    revalidatePath("/dashboard/pages");
    revalidatePath(`/dashboard/pages/${result.pageId}`);
    revalidatePath("/dashboard");
    return json({ pageId: result.pageId, shortCode: result.shortCode });
  } catch (error) {
    if (error instanceof PageError) return json({ error: error.message }, error.status);
    console.error("[pages] Upload storage or transaction failed.");
    return json({ error: "Could not finish the upload. Please try again." }, 503);
  }
}
