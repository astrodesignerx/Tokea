import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { listMyTasks } from "@/lib/checklists/data";
import { TaskList } from "@/components/checklists/task-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyTasksPage() {
  const user = await requireUser();
  const tasks = await listMyTasks(user.id);
  return <div className="cl-workspace">
    <section className="cl-main qr-rise">
      <p className="nf-eyebrow">Across your lists</p>
      <h1 className="mt-2 font-display text-2xl font-medium">My tasks</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{tasks.length} open {tasks.length === 1 ? "task" : "tasks"}, ordered by due date.</p>
      {tasks.length ? <div className="space-y-3">{tasks.map((item) => <div key={item.id} className="nf-panel">
        <Link className="block px-4 pt-3 text-xs font-medium text-brand hover:underline" href={`/dashboard/checklists/${item.checklist_id}`}>{item.list_title}</Link>
        <TaskList checklistId={item.checklist_id} items={[item]} members={[]} userId={user.id} compact />
      </div>)}</div> : <Card><CardContent className="space-y-4 pt-6">
        <h2 className="font-display text-lg">Nothing waiting for you</h2>
        <p className="text-sm text-muted-foreground">Tasks assigned to you and unassigned tasks in your personal lists appear here.</p>
        <Button asChild size="sm"><Link href="/dashboard/checklists?new=1">New list</Link></Button>
      </CardContent></Card>}
    </section>
    <aside className="cl-people space-y-3 text-sm text-muted-foreground">
      <h2 className="nf-eyebrow">Your next steps</h2>
      <p>Tick a task here, or open its list to add notes, assign it or change its due date.</p>
      <p>Inviting someone makes a list a team list. Unassigned team tasks stay in that list until someone takes them on.</p>
      <p>Due dates follow the calendar in Nairobi.</p>
    </aside>
  </div>;
}
