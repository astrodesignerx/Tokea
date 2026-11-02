import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ACTIONS, can, dueState, hashInviteToken, isTeam, needsRenumber, newInviteToken, positionBetween } from "../src/lib/checklists/rules";
import { safeNext } from "../src/lib/checklists/redirect";
import { nairobiToday, pickDueTasks, type ReminderTask } from "../src/lib/checklists/reminders";
import { taskReminderEmail } from "../src/lib/emails";

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
console.log("checklists checks: all passed");
