import { nairobiToday } from "./reminders";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type RepeatSettings = { repeat: "none" | "daily" | "weekly"; repeat_weekday: number | null };
type RepeatingList = { repeat: string; repeat_weekday: number | null; last_reset_on: Date | null; archived_at: Date | null };

export function repeatSettings(repeat: string, weekday: string): RepeatSettings | null {
  if (repeat === "none" || repeat === "daily") return { repeat, repeat_weekday: null };
  if (repeat !== "weekly" || !/^[0-6]$/.test(weekday)) return null;
  return { repeat, repeat_weekday: Number(weekday) };
}

/** Date-only period keys, not instants. Nairobi midnight is 21:00 UTC the day before. */
export function repeatPeriodStart(repeat: string, weekday: number | null, now = new Date()): Date | null {
  if (repeat !== "daily" && repeat !== "weekly") return null;
  const start = new Date(`${nairobiToday(now)}T00:00:00Z`);
  if (repeat === "weekly") {
    if (weekday === null || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() - weekday + 7) % 7);
  }
  return start;
}

export function resetDue(list: RepeatingList, now = new Date()): Date | null {
  if (list.archived_at) return null;
  const period = repeatPeriodStart(list.repeat, list.repeat_weekday, now);
  return period && (!list.last_reset_on || list.last_reset_on < period) ? period : null;
}

export function repeatLabel(repeat: string, weekday: number | null): string | null {
  if (repeat === "daily") return "Repeats daily";
  return repeat === "weekly" && weekday !== null && WEEKDAYS[weekday] ? `Repeats on ${WEEKDAYS[weekday]}s` : null;
}
