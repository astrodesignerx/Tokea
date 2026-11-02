import { createHash, randomBytes } from "node:crypto";

export { dueState } from "./due-state";
export type { DueState } from "./due-state";

export const LIMITS = { lists: 100, items: 500, people: 20, title: 200, notes: 2000, listTitle: 120 } as const;
export const ACTIONS = [
  "add", "edit", "tick", "untick", "assign", "due", "reorder", "deleteItem", "leave",
  "rename", "repeat", "archive", "restore", "deleteList", "invite", "cancelInvite", "removeMember",
] as const;
export type ChecklistAction = (typeof ACTIONS)[number];
const EDITOR_ACTIONS: readonly ChecklistAction[] = ["add", "edit", "tick", "untick", "assign", "due", "reorder", "deleteItem", "leave"];

export function can(role: string, action: ChecklistAction): boolean {
  if (!ACTIONS.includes(action)) return false;
  if (role === "owner") return action !== "leave";
  return role === "editor" && EDITOR_ACTIONS.includes(action);
}

export const POSITION_STEP = 1024;
export const MIN_POSITION_GAP = 1e-6;

export function needsRenumber(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false;
  const midpoint = (before + after) / 2;
  return after - before < MIN_POSITION_GAP || midpoint === before || midpoint === after;
}

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return after! - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  return before + (after - before) / 2;
}

export function isTeam(memberCount: number, pendingInviteCount: number): boolean {
  return memberCount > 1 || pendingInviteCount > 0;
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}
