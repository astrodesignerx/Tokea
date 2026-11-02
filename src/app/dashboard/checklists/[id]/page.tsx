import { requireUser } from "@/lib/require-user";
import { getChecklist } from "@/lib/checklists/data";
import { TaskList } from "@/components/checklists/task-list";
import { PeoplePanel } from "@/components/checklists/people-panel";
import { ActivityFeed } from "@/components/checklists/activity-feed";
import { Badge } from "@/components/ui/badge";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { checklist, member, items, members, invites, activity, team } = await getChecklist(id, user.id);
  const tasks = items.filter((item) => item.kind === "task");
  const done = tasks.filter((item) => item.done_at).length;
  const archived = !!checklist.archived_at;
  return <div className="cl-workspace">
    <section className="cl-main qr-rise">
      <p className="nf-eyebrow">{team ? `Team list / ${members.length} people` : "Personal list"}</p>
      <h1 className="mt-2 break-words font-display text-2xl font-medium">{checklist.title}</h1>
      <div className="my-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{done} of {tasks.length} done</Badge>
        {archived && <Badge variant="muted">Archived</Badge>}
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Tasks completed" aria-valuenow={done} aria-valuemin={0} aria-valuemax={tasks.length || 1}>
        <div className="cl-progress-fill h-full w-full bg-brand" style={{ transform: `scaleX(${tasks.length ? done / tasks.length : 0})` }} />
      </div>
      {archived && <p className="mb-4 text-sm text-muted-foreground">This list is read-only. {member.role === "owner" ? "Restore it in List settings to keep working." : "Ask the owner to restore it to keep working."}</p>}
      <div className="nf-panel"><TaskList key={id} checklistId={id} items={items} members={members} userId={user.id} archived={archived} /></div>
    </section>
    <aside className="cl-people space-y-7">
      <PeoplePanel checklistId={id} title={checklist.title} members={members} invites={invites} userId={user.id} role={member.role} archived={archived} />
      <ActivityFeed activity={activity} />
    </aside>
  </div>;
}
