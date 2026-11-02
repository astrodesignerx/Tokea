import { dueState } from "./due-state";

export type ReminderTask = { title: string; list_title: string; due_on: Date | string | null };

/** Match the date-only deadlines used by My tasks, including before UTC midnight. */
export function nairobiToday(now = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function pickDueTasks<T extends ReminderTask>(tasks: readonly T[], now = new Date()) {
  const day = (task: T) => task.due_on instanceof Date ? task.due_on.toISOString().slice(0, 10) : task.due_on?.slice(0, 10) ?? "";
  const due = tasks.filter((task) => {
    const state = dueState(task.due_on, now);
    return state === "overdue" || state === "today";
  }).sort((a, b) => {
    const overdue = (task: T) => dueState(task.due_on, now) === "overdue" ? 0 : 1;
    return overdue(a) - overdue(b) || day(a).localeCompare(day(b)) || a.list_title.localeCompare(b.list_title);
  });
  return { tasks: due.slice(0, 20), total: due.length };
}
