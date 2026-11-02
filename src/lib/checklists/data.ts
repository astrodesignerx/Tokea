import { prisma } from "@/lib/db";
import { lockMembership, requireMembership } from "./access";
import { resetChecklist } from "./reset";
import { isTeam } from "./rules";
import type { ChecklistItem, Prisma } from "@/generated/prisma/client";
import type { SidebarList, TaskItem } from "./types";

const pending = () => ({ accepted_at: null, expires_at: { gt: new Date() } });

function presentItem(item: ChecklistItem & { done_by: { name: string | null; email: string } | null }): TaskItem {
  return { ...item, due_on: item.due_on?.toISOString().slice(0, 10) ?? null,
    done_at: item.done_at?.toISOString() ?? null,
    done_by_name: item.done_by?.name ?? item.done_by?.email ?? null };
}

export async function listChecklists(userId: string): Promise<SidebarList[]> {
  const lists = await prisma.checklist.findMany({
    where: { members: { some: { user_id: userId } } },
    include: { _count: { select: {
      members: true, invites: { where: pending() }, items: { where: { kind: "task", done_at: null } },
    } } },
    orderBy: { title: "asc" },
  });
  await Promise.all(lists.map((list) => requireMembership(list.id, userId)));
  return lists.map((list) => ({ id: list.id, title: list.title, archived: !!list.archived_at,
    team: isTeam(list._count.members, list._count.invites), open: list._count.items }));
}

export async function getChecklist(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const { checklist, member } = await lockMembership(tx, id, userId);
    await resetChecklist(tx, checklist);
    const [items, members, invites, activity, event] = await Promise.all([
      tx.checklistItem.findMany({ where: { checklist_id: id }, orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { done_by: { select: { name: true, email: true } } } }),
      tx.checklistMember.findMany({ where: { checklist_id: id }, orderBy: { joined_at: "asc" },
        select: { user_id: true, role: true, user: { select: { name: true, email: true } } } }),
      tx.checklistInvite.findMany({ where: { checklist_id: id, ...pending() },
        select: { id: true, email: true, expires_at: true }, orderBy: { created_at: "asc" } }),
      tx.checklistActivity.findMany({ where: { checklist_id: id }, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: 20,
        select: { id: true, action: true, item_title: true, created_at: true, actor: { select: { name: true, email: true } } } }),
      checklist.event_id ? tx.event.findFirst({ where: { id: checklist.event_id, owner_id: userId }, select: { id: true, title: true } }) : null,
    ]);
    return { checklist, member, event, items: items.map(presentItem), members,
      invites: invites.map((invite) => ({ ...invite, expires_at: invite.expires_at.toISOString() })),
      activity: activity.map((row) => ({ ...row, created_at: row.created_at.toISOString() })),
      team: isTeam(members.length, invites.length) };
  });
}

export async function getEventPrepList(eventId: string, userId: string) {
  const list = await prisma.checklist.findFirst({ where: { event_id: eventId, owner_id: userId } });
  if (!list) return null;
  const { items, checklist } = await getChecklist(list.id, userId);
  const tasks = items.filter((item) => item.kind === "task");
  return { id: list.id, title: list.title, archived: !!checklist.archived_at,
    total: tasks.length, done: tasks.filter((item) => item.done_at).length };
}

export function myTasksWhere(userId: string): Prisma.ChecklistItemWhereInput {
  return {
    kind: "task", done_at: null,
    checklist: { archived_at: null, members: { some: { user_id: userId } } },
    OR: [
      { assignee_id: userId },
      { assignee_id: null, checklist: { owner_id: userId,
        members: { none: { user_id: { not: userId } } }, invites: { none: pending() } } },
    ],
  };
}

export async function checklistCounts(userId: string) {
  const lists = await listChecklists(userId);
  const tasks = await prisma.checklistItem.count({ where: myTasksWhere(userId) });
  return { lists, active: lists.filter((list) => !list.archived).length, tasks };
}

export async function listMyTasks(userId: string) {
  const items = await prisma.checklistItem.findMany({
    where: myTasksWhere(userId),
    include: { checklist: { select: { title: true } }, done_by: { select: { name: true, email: true } } },
    orderBy: [{ due_on: { sort: "asc", nulls: "last" } }, { checklist: { title: "asc" } }, { position: "asc" }, { id: "asc" }],
  });
  await Promise.all([...new Set(items.map((item) => item.checklist_id))].map((id) => requireMembership(id, userId)));
  return items.map((item) => ({ ...presentItem(item), list_title: item.checklist.title }));
}
