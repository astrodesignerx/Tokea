"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { lockPageOwner, PageError } from "@/lib/pages/access";
import { deleteObjects } from "@/lib/pages/storage";

async function change(id: string, write: (tx: Prisma.TransactionClient, ownerId: string) => Promise<void>) {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPageOwner(tx, user.id);
      const page = await tx.page.findFirst({ where: { id, owner_id: user.id, deleted_at: null } });
      if (!page) throw new PageError("Page not found.");
      await write(tx, user.id);
    }, { timeout: 30000 });
    revalidatePath("/dashboard/pages");
    revalidatePath(`/dashboard/pages/${id}`);
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) {
    if (error instanceof PageError) return { error: error.message };
    return { error: "Could not save this change. Please try again." };
  }
}

export async function renamePage(id: string, title: string) {
  const parsed = z.string().trim().min(1).max(120).safeParse(title);
  if (!parsed.success) return { error: "Use 1 to 120 characters for the title." };
  return change(id, async (tx, ownerId) => { await tx.page.update({ where: { id, owner_id: ownerId, deleted_at: null }, data: { title: parsed.data } }); });
}

export async function setPageLive(id: string, live: boolean) {
  if (typeof live !== "boolean") return { error: "Choose whether the link is live." };
  return change(id, async (tx, ownerId) => { await tx.page.update({ where: { id, owner_id: ownerId, deleted_at: null }, data: { is_live: live } }); });
}

export async function setPageBadge(id: string, show: boolean) {
  if (typeof show !== "boolean") return { error: "Choose whether to show the pill." };
  return change(id, async (tx, ownerId) => { await tx.page.update({ where: { id, owner_id: ownerId, deleted_at: null }, data: { show_badge: show } }); });
}

export async function deletePage(id: string) {
  return change(id, async (tx, ownerId) => {
    const files = await tx.pageFile.findMany({ where: { page_id: id, page: { owner_id: ownerId } }, select: { key: true } });
    await deleteObjects(files.map((file) => file.key));
    await tx.page.update({ where: { id, owner_id: ownerId, deleted_at: null }, data: { deleted_at: new Date(), is_live: false, current_file_id: null } });
    await tx.pageFile.deleteMany({ where: { page_id: id, page: { owner_id: ownerId } } });
  });
}
