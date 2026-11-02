"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { lockMembership, requireMembership } from "@/lib/checklists/access";
import { can, LIMITS, needsRenumber, positionBetween, POSITION_STEP, type ChecklistAction } from "@/lib/checklists/rules";
import { ChecklistError, createInvite, cancelInvite, cancelUndeliveredInvite } from "@/lib/checklists/invites";
import { checklistInviteEmail } from "@/lib/emails";
import { sendEmail } from "@/lib/email";
import { getCardsOrigin } from "@/lib/cards/links";
import { canHaveSubtasks } from "@/lib/checklists/hierarchy";
import { repeatPeriodStart, repeatSettings } from "@/lib/checklists/repeat";
import { resetChecklist } from "@/lib/checklists/reset";

/** Every body id is attacker-controlled. Lock, re-check membership and scope child ids to that list. */
export type ChecklistState = { error: string | null; errorAt?: number; savedAt?: number };
const PATH = "/dashboard/checklists";
const TASK_ACTIONS = new Set<ChecklistAction>(["add", "edit", "tick", "untick", "assign", "due", "reorder", "deleteItem"]);
const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const failed = (error: string): ChecklistState => ({ error, errorAt: Date.now() });

export async function setTaskRemindersAction(form: FormData): Promise<ChecklistState> {
  const user = await requireUser();
  const enabled = value(form, "task_reminders");
  if (enabled !== "true" && enabled !== "false") return failed("Choose whether to receive morning emails.");
  await prisma.user.update({ where: { id: user.id }, data: { task_reminders: enabled === "true" } });
  refresh();
  return { error: null, savedAt: Date.now() };
}

function title(form: FormData, key: string, max: number) {
  const text = value(form, key);
  if (!text || text.length > max) throw new ChecklistError(`Use 1 to ${max} characters for the title.`);
  return text;
}

function refresh(id?: string, eventId?: string | null) {
  revalidatePath(PATH, "layout");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`${PATH}/${id}`);
  if (eventId) revalidatePath(`/dashboard/events/${eventId}`);
}

type Context = { tx: Prisma.TransactionClient; id: string; user: Awaited<ReturnType<typeof requireUser>>; form: FormData };
async function change(action: ChecklistAction, form: FormData, write: (context: Context) => Promise<void>): Promise<ChecklistState> {
  const user = await requireUser();
  const id = value(form, "checklist_id");
  let eventId: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      // Create and restore share the owner's row lock for the active-list limit.
      if (action === "restore") await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const { checklist, member } = await lockMembership(tx, id, user.id);
      if (!can(member.role, action)) throw new ChecklistError("You do not have permission to do that.");
      if (checklist.archived_at && TASK_ACTIONS.has(action)) throw new ChecklistError("Restore this list before changing its tasks.");
      eventId = checklist.event_id;
      await resetChecklist(tx, checklist);
      await write({ tx, id, user, form });
    });
  } catch (error) {
    if (error instanceof ChecklistError) return failed(error.message);
    throw error;
  }
  refresh(id, eventId);
  return { error: null, savedAt: Date.now() };
}

async function log(context: Context, action: string, itemTitle?: string) {
  await context.tx.checklistActivity.create({ data: { checklist_id: context.id, actor_id: context.user.id, action, item_title: itemTitle } });
}

async function item(context: Context, taskOnly = false) {
  const row = await context.tx.checklistItem.findFirst({ where: { id: value(context.form, "item_id"), checklist_id: context.id } });
  if (!row) throw new ChecklistError("That item is no longer in this list.");
  if (taskOnly && row.kind !== "task") throw new ChecklistError("Headings cannot be ticked, assigned or given a due date.");
  return row;
}

async function position(context: Context, parentId: string | null, movingId?: string) {
  const rows = await context.tx.checklistItem.findMany({ where: { checklist_id: context.id, parent_id: parentId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, position: true } });
  const remaining = rows.filter((row) => row.id !== movingId);
  const beforeId = value(context.form, "before_id");
  const afterId = value(context.form, "after_id");
  // With no neighbours an add appends. Moves always submit the surrounding ids.
  const index = beforeId ? remaining.findIndex((row) => row.id === beforeId) + 1 : afterId ? 0 : remaining.length;
  if ((beforeId && index === 0) || (afterId && remaining[index]?.id !== afterId) || (!afterId && index !== remaining.length)) {
    throw new ChecklistError("The task order changed. Refresh and try again.");
  }
  let before = remaining[index - 1]?.position ?? null;
  let after = remaining[index]?.position ?? null;
  if (needsRenumber(before, after)) {
    // A single update avoids hundreds of round trips inside the transaction.
    await context.tx.$executeRaw`
      WITH positions AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) * 1024 AS next_position
        FROM "ChecklistItem" WHERE checklist_id = ${context.id} AND parent_id IS NOT DISTINCT FROM ${parentId}
      )
      UPDATE "ChecklistItem" AS item SET position = positions.next_position, updated_at = NOW()
      FROM positions WHERE item.id = positions.id
    `;
    rows.forEach((row, index) => { row.position = (index + 1) * POSITION_STEP; });
    before = remaining[index - 1]?.position ?? null;
    after = remaining[index]?.position ?? null;
  }
  return positionBetween(before, after);
}

export async function createChecklistAction(_prev: ChecklistState, form: FormData): Promise<ChecklistState> {
  const user = await requireUser();
  let id: string;
  try {
    const name = title(form, "title", LIMITS.listTitle);
    id = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      if (await tx.checklist.count({ where: { owner_id: user.id, archived_at: null } }) >= LIMITS.lists) throw new ChecklistError("You can own at most 100 active lists. Archive one first.");
      const list = await tx.checklist.create({ data: { owner_id: user.id, title: name,
        members: { create: { user_id: user.id, role: "owner" } },
        activity: { create: { actor_id: user.id, action: "added", item_title: `List: ${name}` } },
      } });
      await requireMembership(list.id, user.id, tx);
      return list.id;
    });
  } catch (error) {
    if (error instanceof ChecklistError) return failed(error.message);
    throw error;
  }
  refresh();
  redirect(`${PATH}/${id}`);
}

export async function renameChecklistAction(_prev: ChecklistState, form: FormData) {
  return change("rename", form, async (c) => {
    const name = title(form, "title", LIMITS.listTitle);
    await c.tx.checklist.update({ where: { id: c.id }, data: { title: name } });
    await log(c, "edited", `List title: ${name}`);
  });
}

export async function setChecklistRepeatAction(_prev: ChecklistState, form: FormData) {
  return change("repeat", form, async (c) => {
    const settings = repeatSettings(value(form, "repeat"), value(form, "repeat_weekday"));
    if (!settings) throw new ChecklistError("Choose a valid repeat schedule and weekday.");
    const list = await c.tx.checklist.findUniqueOrThrow({ where: { id: c.id } });
    if (list.repeat === settings.repeat && list.repeat_weekday === settings.repeat_weekday) return;
    // Enabling or changing the schedule starts this period without clearing completed work.
    await c.tx.checklist.update({ where: { id: c.id }, data: {
      ...settings, last_reset_on: repeatPeriodStart(settings.repeat, settings.repeat_weekday),
    } });
    await log(c, "edited", "List repeat schedule");
  });
}

export async function createEventPrepListAction(_prev: ChecklistState, form: FormData): Promise<ChecklistState> {
  const user = await requireUser();
  const eventId = value(form, "event_id");
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
      const event = await tx.event.findFirst({ where: { id: eventId, owner_id: user.id } });
      if (!event) throw new ChecklistError("That event is unavailable.");
      const existing = await tx.checklist.findUnique({ where: { event_id: eventId } });
      if (existing) {
        const { member } = await lockMembership(tx, existing.id, user.id);
        if (existing.owner_id !== user.id || !can(member.role, "rename")) throw new ChecklistError("You do not have permission to do that.");
        return existing.id;
      }
      // Existing prep lists do not need the owner's creation-limit lock.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      if (await tx.checklist.count({ where: { owner_id: user.id, archived_at: null } }) >= LIMITS.lists) throw new ChecklistError("You can own at most 100 active lists. Archive one first.");
      const list = await tx.checklist.create({ data: {
        owner_id: user.id, event_id: eventId, title: `${event.title} prep`,
        members: { create: { user_id: user.id, role: "owner" } },
        items: { create: ["Confirm venue", "Send invites", "Order refreshments", "Print QR codes", "Assign check-in"].map((name, index) => ({
          title: name, kind: "task", position: (index + 1) * POSITION_STEP, created_by_id: user.id,
        })) },
        activity: { create: { actor_id: user.id, action: "added", item_title: "Event prep list" } },
      } });
      await requireMembership(list.id, user.id, tx);
      return list.id;
    });
  } catch (error) {
    if (error instanceof ChecklistError) return failed(error.message);
    throw error;
  }
  refresh(id);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`${PATH}/${id}`);
}

export async function archiveChecklistAction(_prev: ChecklistState, form: FormData) {
  return change("archive", form, async (c) => {
    await c.tx.checklist.update({ where: { id: c.id }, data: { archived_at: new Date() } });
    await log(c, "edited", "List archived");
  });
}

export async function restoreChecklistAction(_prev: ChecklistState, form: FormData) {
  return change("restore", form, async (c) => {
    const list = await c.tx.checklist.findUniqueOrThrow({ where: { id: c.id } });
    if (list.archived_at && await c.tx.checklist.count({ where: { owner_id: c.user.id, archived_at: null } }) >= LIMITS.lists) throw new ChecklistError("You can own at most 100 active lists. Archive one first.");
    await c.tx.checklist.update({ where: { id: c.id }, data: { archived_at: null } });
    await log(c, "edited", "List restored");
  });
}

export async function deleteChecklistAction(_prev: ChecklistState, form: FormData) {
  const state = await change("deleteList", form, async (c) => {
    await log(c, "removed", "List deleted");
    await c.tx.checklist.delete({ where: { id: c.id } });
  });
  if (state.error) return state;
  redirect(PATH);
}

export async function addChecklistItemAction(_prev: ChecklistState, form: FormData) {
  return change("add", form, async (c) => {
    if (await c.tx.checklistItem.count({ where: { checklist_id: c.id } }) >= LIMITS.items) throw new ChecklistError("A list can have at most 500 items, including headings.");
    const kind = value(form, "kind") || "task";
    if (kind !== "task" && kind !== "heading") throw new ChecklistError("Choose a task or heading.");
    const parentId = value(form, "parent_id") || null;
    if (parentId) {
      const parent = await c.tx.checklistItem.findFirst({ where: { id: parentId, checklist_id: c.id } });
      if (!parent || !canHaveSubtasks(parent) || kind !== "task") throw new ChecklistError("Sub-tasks need a top-level task in this list as their parent.");
    }
    const name = title(form, "title", LIMITS.title);
    await c.tx.checklistItem.create({ data: { checklist_id: c.id, parent_id: parentId, kind, title: name, position: await position(c, parentId), created_by_id: c.user.id } });
    await log(c, "added", name);
  });
}

export async function editChecklistItemAction(_prev: ChecklistState, form: FormData) {
  return change("edit", form, async (c) => {
    const row = await item(c);
    const name = title(form, "title", LIMITS.title);
    const notes = value(form, "notes");
    if (notes.length > LIMITS.notes) throw new ChecklistError("Notes can have at most 2000 characters.");
    await c.tx.checklistItem.update({ where: { id: row.id }, data: { title: name, notes: notes || null } });
    await log(c, "edited", name);
  });
}

export async function deleteChecklistItemAction(_prev: ChecklistState, form: FormData) {
  return change("deleteItem", form, async (c) => {
    const row = await item(c);
    const childCount = await c.tx.checklistItem.count({ where: { checklist_id: c.id, parent_id: row.id } });
    if (value(form, "subtask_count") !== String(childCount)) throw new ChecklistError("The sub-task count changed. Refresh the list and confirm the new count before deleting.");
    await c.tx.checklistItem.delete({ where: { id: row.id } });
    await log(c, "removed", row.title);
  });
}

async function tick(form: FormData, done: boolean) {
  return change(done ? "tick" : "untick", form, async (c) => {
    const row = await item(c, true);
    if (!!row.done_at === done) return;
    await c.tx.checklistItem.update({ where: { id: row.id }, data: { done_at: done ? new Date() : null, done_by_id: done ? c.user.id : null } });
    await log(c, done ? "ticked" : "unticked", row.title);
  });
}
export async function tickChecklistItemAction(_prev: ChecklistState, form: FormData) { return tick(form, true); }
export async function untickChecklistItemAction(_prev: ChecklistState, form: FormData) { return tick(form, false); }

export async function assignChecklistItemAction(_prev: ChecklistState, form: FormData) {
  return change("assign", form, async (c) => {
    const row = await item(c, true);
    const assignee = value(form, "assignee_id") || null;
    if (assignee && !await c.tx.checklistMember.findUnique({ where: { checklist_id_user_id: { checklist_id: c.id, user_id: assignee } } })) throw new ChecklistError("Assign tasks only to current members.");
    await c.tx.checklistItem.update({ where: { id: row.id }, data: { assignee_id: assignee } });
    const person = assignee ? await c.tx.user.findUniqueOrThrow({ where: { id: assignee }, select: { name: true, email: true } }) : null;
    await log(c, "assigned", `${row.title} (${person ? person.name || person.email : "unassigned"})`);
  });
}

export async function setChecklistDueAction(_prev: ChecklistState, form: FormData) {
  return change("due", form, async (c) => {
    const row = await item(c, true);
    const raw = value(form, "due_on");
    let date: Date | null = null;
    if (raw) {
      date = new Date(`${raw}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== raw) throw new ChecklistError("Choose a valid due date.");
    }
    await c.tx.checklistItem.update({ where: { id: row.id }, data: { due_on: date } });
    await log(c, "edited", `${row.title} (${raw ? `due ${raw}` : "due date cleared"})`);
  });
}

export async function reorderChecklistItemAction(_prev: ChecklistState, form: FormData) {
  return change("reorder", form, async (c) => {
    const row = await item(c);
    await c.tx.checklistItem.update({ where: { id: row.id }, data: { position: await position(c, row.parent_id, row.id) } });
    await log(c, "edited", `${row.title} (moved)`);
  });
}

export async function inviteChecklistMemberAction(_prev: ChecklistState, form: FormData): Promise<ChecklistState> {
  let created: Awaited<ReturnType<typeof createInvite>> | undefined;
  let sender: Awaited<ReturnType<typeof requireUser>> | undefined;
  const email = value(form, "email").toLowerCase();
  const state = await change("invite", form, async (c) => {
    if (!z.string().email().max(254).safeParse(email).success) throw new ChecklistError("Enter a valid email address.");
    sender = c.user;
    created = await createInvite(c.tx, c.id, c.user.id, email);
  });
  if (state.error || !created || !sender) return state;
  const template = checklistInviteEmail({ inviterName: sender.name || sender.email, listTitle: created.title,
    joinUrl: `${await getCardsOrigin()}/join/${created.token}` });
  const sent = await sendEmail({ to: email, ...template });
  if (!sent.ok) {
    await cancelUndeliveredInvite(value(form, "checklist_id"), sender.id, created.id);
    refresh(value(form, "checklist_id"));
    return failed("The invite email could not be sent. Please try again.");
  }
  return state;
}

export async function cancelChecklistInviteAction(_prev: ChecklistState, form: FormData) {
  return change("cancelInvite", form, async (c) => { await cancelInvite(c.tx, c.id, c.user.id, value(form, "invite_id")); });
}

async function removePerson(form: FormData, leaving: boolean) {
  return change(leaving ? "leave" : "removeMember", form, async (c) => {
    const targetId = leaving ? c.user.id : value(form, "user_id");
    const member = await c.tx.checklistMember.findUnique({ where: { checklist_id_user_id: { checklist_id: c.id, user_id: targetId } }, include: { user: { select: { name: true, email: true } } } });
    if (!member) throw new ChecklistError("That person is no longer a member.");
    if (member.role === "owner") throw new ChecklistError("The owner cannot leave or be removed.");
    const open = await c.tx.checklistItem.findMany({ where: { checklist_id: c.id, assignee_id: targetId, done_at: null }, select: { id: true, title: true } });
    await c.tx.checklistItem.updateMany({ where: { checklist_id: c.id, assignee_id: targetId, done_at: null }, data: { assignee_id: null } });
    if (open.length) await c.tx.checklistActivity.createMany({ data: open.map((task) => ({ checklist_id: c.id, actor_id: c.user.id, action: "assigned", item_title: `${task.title} (unassigned)` })) });
    await c.tx.checklistMember.delete({ where: { id: member.id } });
    await log(c, leaving ? "left" : "removed", leaving ? undefined : `Member: ${member.user.name || member.user.email}`);
  });
}
export async function removeChecklistMemberAction(_prev: ChecklistState, form: FormData) { return removePerson(form, false); }
export async function leaveChecklistAction(_prev: ChecklistState, form: FormData) {
  const state = await removePerson(form, true);
  if (state.error) return state;
  redirect(PATH);
}
