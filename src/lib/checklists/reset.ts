import type { Checklist, Prisma } from "@/generated/prisma/client";
import { resetDue } from "./repeat";

/** The caller must hold the checklist row lock and have checked access, unless running the cron. */
export async function resetChecklist(tx: Prisma.TransactionClient, list: Checklist, now = new Date()) {
  const period = resetDue(list, now);
  if (!period) return false;
  await tx.checklistItem.updateMany({
    where: { checklist_id: list.id, kind: "task" }, data: { done_at: null, done_by_id: null },
  });
  await tx.checklist.update({ where: { id: list.id }, data: { last_reset_on: period } });
  await tx.checklistActivity.create({ data: {
    checklist_id: list.id, actor_id: list.owner_id, action: "reset",
    item_title: `List reset for the new ${list.repeat === "daily" ? "day" : "week"}`,
  } });
  return true;
}
