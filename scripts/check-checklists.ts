import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ACTIONS, can, dueState, hashInviteToken, isTeam, needsRenumber, newInviteToken, positionBetween } from "../src/lib/checklists/rules";
import { safeNext } from "../src/lib/checklists/redirect";
import { nairobiToday, pickDueTasks, type ReminderTask } from "../src/lib/checklists/reminders";
import { taskReminderEmail } from "../src/lib/emails";
import { repeatLabel, repeatPeriodStart, repeatSettings, resetDue } from "../src/lib/checklists/repeat";
import { canHaveSubtasks, groupSubtasks } from "../src/lib/checklists/hierarchy";
import { resetChecklist } from "../src/lib/checklists/reset";
import type { Checklist, Prisma } from "../src/generated/prisma/client";

const editor = new Set(["add", "edit", "tick", "untick", "assign", "due", "reorder", "deleteItem", "leave"]);
for (const action of ACTIONS) {
  assert.equal(can("owner", action), action !== "leave", `owner ${action}`);
  assert.equal(can("editor", action), editor.has(action), `editor ${action}`);
  assert.equal(can("stranger", action), false, `stranger ${action}`);
}
assert.equal(positionBetween(null, null), 1024);
assert.equal(positionBetween(null, 1024), 0);
assert.equal(positionBetween(1024, null), 2048);
assert.equal(positionBetween(1024, 2048), 1536);
assert.equal(needsRenumber(0, 0.0000009), true);
assert.equal(needsRenumber(0, 0.000001), false);
assert.equal(needsRenumber(null, 0), false);
assert.equal(needsRenumber(0, null), false);
assert.equal(needsRenumber(1024, 1024), true);
const beforeMidnight = new Date("2026-10-28T20:59:00Z");
const afterMidnight = new Date("2026-10-28T21:01:00Z");
assert.equal(dueState("2026-10-28", beforeMidnight), "today");
assert.equal(dueState("2026-10-28", afterMidnight), "overdue");
assert.equal(dueState("2026-10-29", beforeMidnight), "soon");
assert.equal(dueState("2026-10-29", afterMidnight), "today");
assert.equal(dueState(new Date("2026-11-01T00:00:00Z"), afterMidnight), "soon");
assert.equal(dueState("2026-11-02", afterMidnight), "later");
assert.equal(dueState(null, afterMidnight), "none");
assert.equal(nairobiToday(beforeMidnight), "2026-10-28");
assert.equal(nairobiToday(afterMidnight), "2026-10-29");
assert.equal(nairobiToday(new Date("2026-12-31T21:01:00Z")), "2027-01-01");
const reminderTasks: ReminderTask[] = [
  { title: "Today", list_title: "A", due_on: "2026-10-29" },
  { title: "Later", list_title: "A", due_on: "2026-10-30" },
  { title: "Undated", list_title: "A", due_on: null },
  { title: "Overdue Z", list_title: "Z", due_on: new Date("2026-10-28T00:00:00Z") },
  { title: "Oldest", list_title: "Z", due_on: "2026-10-27" },
  { title: "Overdue A", list_title: "A", due_on: "2026-10-28" },
];
const selected = pickDueTasks(reminderTasks, afterMidnight);
assert.deepEqual(selected.tasks.map((task) => task.title), ["Oldest", "Overdue A", "Overdue Z", "Today"]);
assert.equal(selected.total, 4);
assert.equal(reminderTasks[0].title, "Today", "selection must not mutate its input");
assert.deepEqual(pickDueTasks([], afterMidnight), { tasks: [], total: 0 });
assert.equal(pickDueTasks(reminderTasks, beforeMidnight).total, 3);
const manyTasks = Array.from({ length: 25 }, (_, index) => ({ title: `Task ${index}`, list_title: "List", due_on: "2026-10-29" }));
const capped = pickDueTasks(manyTasks, afterMidnight);
assert.equal(capped.tasks.length, 20);
assert.equal(capped.total, 25);
const emailInput = { name: "A & B", overdue: [], today: [reminderTasks[0]], more: 0,
  myTasksUrl: "https://example.test/dashboard/checklists", settingsUrl: "https://example.test/dashboard/checklists?settings=reminders" };
assert.equal(taskReminderEmail(emailInput).subject, "1 task due today");
assert.equal(taskReminderEmail({ ...emailInput, today: manyTasks.slice(0, 3) }).subject, "3 tasks due today");
assert.equal(taskReminderEmail({ ...emailInput, overdue: reminderTasks.slice(3, 5) }).subject, "2 overdue, 1 due today");
assert.equal(taskReminderEmail({ ...emailInput, overdue: [reminderTasks[3]], today: [] }).subject, "1 overdue");
const reminderEmail = taskReminderEmail({ ...emailInput, overdue: [reminderTasks[3]], more: 5,
  today: [{ title: "<script>bad</script>", list_title: "<List>", due_on: "2026-10-29" }] });
assert.ok(reminderEmail.html.includes("A &amp; B"));
assert.ok(reminderEmail.html.includes("&lt;script&gt;bad&lt;/script&gt;"));
assert.ok(!reminderEmail.html.includes("<script>"));
assert.ok(reminderEmail.text.includes("Overdue Z: Z (due 2026-10-28)"));
assert.ok(reminderEmail.text.includes("And 5 more tasks"));
assert.ok(reminderEmail.text.includes(`Turn these emails off: ${emailInput.settingsUrl}`));
assert.equal(isTeam(1, 0), false);
assert.equal(isTeam(2, 0), true);
assert.equal(isTeam(1, 1), true);
const token = newInviteToken();
assert.match(token, /^[A-Za-z0-9_-]{43}$/);
assert.equal(Buffer.from(token, "base64url").length, 32);
assert.notEqual(token, newInviteToken());
assert.equal(hashInviteToken(token), createHash("sha256").update(token).digest("hex"));
assert.equal(hashInviteToken("test"), "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
assert.notEqual(hashInviteToken(token), hashInviteToken(newInviteToken()));
assert.equal(safeNext("/join/abc"), "/join/abc");
for (const unsafe of [undefined, ["/dashboard"], "https://example.com", "//example.com", "/\\example.com", "/\n/example.com", ""]) assert.equal(safeNext(unsafe), "/dashboard");

// Nairobi midnight, weekly boundaries, and periods spanning a month or year.
const period = (repeat: string, weekday: number | null, instant: string) => repeatPeriodStart(repeat, weekday, new Date(instant))?.toISOString().slice(0, 10) ?? null;
assert.equal(period("daily", null, "2026-11-02T20:59:59.999Z"), "2026-11-02");
assert.equal(period("daily", null, "2026-11-02T21:00:00Z"), "2026-11-03");
assert.equal(period("weekly", 1, "2026-11-01T20:59:59.999Z"), "2026-10-26");
assert.equal(period("weekly", 1, "2026-11-01T21:00:00Z"), "2026-11-02");
assert.equal(period("weekly", 0, "2026-10-31T21:00:00Z"), "2026-11-01");
assert.equal(period("daily", null, "2026-12-31T21:00:00Z"), "2027-01-01");
assert.equal(period("weekly", 1, "2027-01-01T00:00:00Z"), "2026-12-28");
assert.equal(period("daily", null, "2028-02-28T21:00:00Z"), "2028-02-29");
assert.equal(period("none", null, "2026-11-02T00:00:00Z"), null);
for (const weekday of [null, -1, 7, 1.5, NaN]) assert.equal(repeatPeriodStart("weekly", weekday), null);
for (let weekday = 0; weekday <= 6; weekday++) {
  const start = repeatPeriodStart("weekly", weekday, new Date("2026-11-04T12:00:00Z"))!;
  assert.equal(start.getUTCDay(), weekday);
  assert.ok(start <= new Date("2026-11-04T00:00:00Z"));
  assert.ok(start > new Date("2026-10-28T00:00:00Z"));
}
assert.deepEqual(repeatSettings("weekly", "0"), { repeat: "weekly", repeat_weekday: 0 });
assert.deepEqual(repeatSettings("daily", "4"), { repeat: "daily", repeat_weekday: null });
assert.deepEqual(repeatSettings("none", ""), { repeat: "none", repeat_weekday: null });
for (const invalid of ["", "-1", "7", "1.5", "01", "Monday"]) assert.equal(repeatSettings("weekly", invalid), null);
assert.equal(repeatSettings("monthly", "1"), null);
assert.equal(repeatLabel("daily", null), "Repeats daily");
assert.equal(repeatLabel("weekly", 1), "Repeats on Mondays");
assert.equal(repeatLabel("weekly", 0), "Repeats on Sundays");
assert.equal(repeatLabel("none", null), null);
assert.equal(repeatLabel("weekly", 7), null);
const repeating = { repeat: "daily", repeat_weekday: null, archived_at: null, last_reset_on: new Date("2026-11-02T00:00:00Z") };
const resetTime = new Date("2026-11-02T21:00:00Z");
assert.equal(resetDue(repeating, new Date("2026-11-02T20:59:59Z")), null);
assert.equal(resetDue(repeating, resetTime)?.toISOString().slice(0, 10), "2026-11-03");
assert.equal(resetDue({ ...repeating, last_reset_on: null }, resetTime)?.toISOString().slice(0, 10), "2026-11-03");
assert.equal(resetDue({ ...repeating, archived_at: resetTime }, resetTime), null);
assert.equal(resetDue({ ...repeating, repeat: "none" }, resetTime), null);
assert.equal(resetDue({ ...repeating, last_reset_on: new Date("2026-11-04T00:00:00Z") }, resetTime), null);
assert.equal(resetDue({ ...repeating, repeat: "weekly", repeat_weekday: 1 }, new Date("2026-11-08T20:59:59Z")), null);
assert.equal(resetDue({ ...repeating, repeat: "weekly", repeat_weekday: 1 }, new Date("2026-11-08T21:00:00Z"))?.toISOString().slice(0, 10), "2026-11-09");

// A child can never become another parent. Unrelated rows retain their sibling order.
const parent = { id: "parent", parent_id: null, kind: "task" };
const child = { id: "child", parent_id: "parent", kind: "task" };
const heading = { id: "heading", parent_id: null, kind: "heading" };
const other = { id: "other", parent_id: null, kind: "task" };
const secondChild = { id: "second-child", parent_id: "parent", kind: "task" };
assert.equal(canHaveSubtasks(parent), true);
assert.equal(canHaveSubtasks(child), false);
assert.equal(canHaveSubtasks(heading), false);
const mixed = [child, heading, parent, other, secondChild];
assert.deepEqual(groupSubtasks(mixed).map((row) => row.id), ["heading", "parent", "child", "second-child", "other"]);
assert.equal(mixed[0], child);
assert.deepEqual(groupSubtasks([other, child, parent, secondChild, heading]).map((row) => row.id), ["other", "parent", "child", "second-child", "heading"]);
assert.deepEqual(groupSubtasks([]), []);
const childReminder = { title: "Child task", list_title: "Prep", due_on: "2026-10-29", parent_id: "parent" };
assert.deepEqual(pickDueTasks([childReminder], afterMidnight).tasks, [childReminder]);
assert.ok(taskReminderEmail({ ...emailInput, today: [childReminder] }).text.includes("Child task: Prep"));

// Exercise the reset writes without importing the database or contacting a server.
async function checkResetWrites() {
  const list: Checklist = { ...repeating, id: "list", owner_id: "owner", title: "Daily", event_id: null, created_at: resetTime, updated_at: resetTime };
  const rows: { id: string; checklist_id: string; kind: string; parent_id: string | null; done_at: Date | null;
    done_by_id: string | null; assignee_id: string | null; due_on: string | null }[] = [
    { id: "parent", checklist_id: "list", kind: "task", parent_id: null, done_at: resetTime, done_by_id: "editor", assignee_id: "editor", due_on: "2026-11-01" },
    { id: "child", checklist_id: "list", kind: "task", parent_id: "parent", done_at: resetTime, done_by_id: "owner", assignee_id: "owner", due_on: "2026-11-04" },
    { id: "other", checklist_id: "another-list", kind: "task", parent_id: null, done_at: resetTime, done_by_id: "editor", assignee_id: "editor", due_on: null },
    { id: "heading", checklist_id: "list", kind: "heading", parent_id: null, done_at: null, done_by_id: null, assignee_id: null, due_on: null },
  ];
  const logs: { action: string; item_title: string; actor_id: string }[] = [];
  let updates = 0;
  const tx = {
    checklistItem: { updateMany: async ({ where, data }: Prisma.ChecklistItemUpdateManyArgs) => {
      updates++;
      assert.deepEqual(Object.keys(data).sort(), ["done_at", "done_by_id"]);
      for (const row of rows) if (row.checklist_id === where?.checklist_id && row.kind === where.kind) Object.assign(row, data);
    } },
    checklist: { update: async ({ data }: Prisma.ChecklistUpdateArgs) => { Object.assign(list, data); } },
    checklistActivity: { create: async ({ data }: { data: typeof logs[number] }) => { logs.push(data); } },
  } as unknown as Prisma.TransactionClient;
  assert.equal(await resetChecklist(tx, list, resetTime), true);
  assert.equal(await resetChecklist(tx, list, resetTime), false, "a subsequent lock holder must not reset the same period again");
  assert.equal(updates, 1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].item_title, "List reset for the new day");
  assert.equal(logs[0].actor_id, "owner");
  assert.equal(rows[0].done_at, null);
  assert.equal(rows[0].done_by_id, null);
  assert.equal(rows[1].done_at, null);
  assert.equal(rows[1].done_by_id, null);
  assert.equal(rows[2].done_at, resetTime);
  assert.equal(rows[0].assignee_id, "editor");
  assert.equal(rows[0].due_on, "2026-11-01");
  assert.equal(rows[1].assignee_id, "owner");
  assert.equal(rows[1].due_on, "2026-11-04");
  list.repeat = "weekly"; list.repeat_weekday = 1;
  assert.equal(await resetChecklist(tx, list, new Date("2026-11-08T21:00:00Z")), true);
  assert.equal(logs[1].item_title, "List reset for the new week");
  list.archived_at = resetTime;
  assert.equal(await resetChecklist(tx, list, new Date("2026-11-15T21:00:00Z")), false);
}
void checkResetWrites().then(() => console.log("checklists checks: all passed"));
