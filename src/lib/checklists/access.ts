import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function requireMembership(checklistId: string, userId: string, db: Prisma.TransactionClient = prisma) {
  const row = await db.checklistMember.findUnique({
    where: { checklist_id_user_id: { checklist_id: checklistId, user_id: userId } },
    include: { checklist: true },
  });
  if (!row) notFound();
  const { checklist, ...member } = row;
  return { checklist, member };
}

/** All writers lock the parent before checking access, limits or neighbours. */
export async function lockMembership(tx: Prisma.TransactionClient, checklistId: string, userId: string) {
  await tx.$queryRaw`SELECT id FROM "Checklist" WHERE id = ${checklistId} FOR UPDATE`;
  return requireMembership(checklistId, userId, tx);
}
