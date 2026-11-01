export type Person = { user_id: string; role: string; user: { name: string | null; email: string } };
export type TaskItem = {
  id: string;
  checklist_id: string;
  kind: string;
  title: string;
  notes: string | null;
  position: number;
  assignee_id: string | null;
  due_on: string | null;
  done_at: string | null;
  done_by_id: string | null;
  done_by_name: string | null;
};
export type SidebarList = { id: string; title: string; archived: boolean; team: boolean; open: number };
export type PendingInvite = { id: string; email: string; expires_at: string };
export type Activity = { id: string; action: string; item_title: string | null; created_at: string; actor: { name: string | null; email: string } };
