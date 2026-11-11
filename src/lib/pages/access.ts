import type { Prisma } from "@/generated/prisma/client";
import { quotaProblem } from "@/lib/pages/rules";

export class PageError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

// All page mutations share this lock, including prepare, confirm and delete.
// This serialises quota checks and prevents a late confirmation reviving a deleted page.
export async function lockPageOwner(tx: Prisma.TransactionClient, ownerId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId} FOR UPDATE`;
}

export async function checkPageQuota(tx: Prisma.TransactionClient, ownerId: string, newSize: number, replacingId?: string) {
  const pages = await tx.page.findMany({ where: { owner_id: ownerId, deleted_at: null }, select: { id: true, current_file: { select: { size: true, confirmed_at: true } } } });
  const bytes = pages.reduce((total, page) => total + (page.id !== replacingId && page.current_file?.confirmed_at ? page.current_file.size : 0), 0);
  const problem = quotaProblem(pages.length - (replacingId ? 1 : 0), bytes, newSize);
  if (problem) throw new PageError(problem);
}
