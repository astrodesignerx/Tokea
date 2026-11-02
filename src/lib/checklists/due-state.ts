export type DueState = "overdue" | "today" | "soon" | "later" | "none";

/** Date-only deadlines use Nairobi's calendar, independently of the device zone. */
export function dueState(due: Date | string | null, now = new Date()): DueState {
  if (!due) return "none";
  const day = typeof due === "string" ? due.slice(0, 10) : due.toISOString().slice(0, 10);
  const today = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const distance = (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  if (distance < 0) return "overdue";
  if (distance === 0) return "today";
  return distance <= 3 ? "soon" : "later";
}
