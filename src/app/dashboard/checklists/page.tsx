import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { setTaskRemindersAction } from "@/lib/actions/checklists";
import { listMyTasks } from "@/lib/checklists/data";
import { TaskList } from "@/components/checklists/task-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<{ settings?: string; reminderError?: string }> }) {
  const user = await requireUser();
  const tasks = await listMyTasks(user.id);
  const params = await searchParams;
  const showReminders = params.settings === "reminders";
  return <div className="cl-workspace">
    <section className="cl-main qr-rise">
      <p className="nf-eyebrow">Across your lists</p>
      <h1 className="mt-2 font-display text-2xl font-medium">My tasks</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{tasks.length} open {tasks.length === 1 ? "task" : "tasks"}, ordered by due date.</p>
      <form id="task-reminders" className={`nf-panel relative mb-6 scroll-mt-24 p-4${showReminders ? " qr-fade" : ""}`} action={async (form) => {
        "use server";
        const state = await setTaskRemindersAction(form);
        if (state.error) redirect(`/dashboard/checklists?settings=reminders&reminderError=${encodeURIComponent(state.error)}#task-reminders`);
      }}>
        {showReminders && <span aria-hidden="true" className="task-reminder-highlight pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-brand" />}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="task-reminders-label" className="text-sm font-medium">Morning email</h2>
            <p id="task-reminders-help" className="mt-1 text-xs text-muted-foreground">Tasks due today or overdue, at 7am</p>
          </div>
          <button type="submit" role="switch" aria-checked={user.task_reminders} aria-labelledby="task-reminders-label" aria-describedby="task-reminders-help"
            name="task_reminders" value={String(!user.task_reminders)} autoFocus={showReminders}
            className="flex shrink-0 items-center gap-2 rounded-full p-1 text-xs transition-opacity duration-(--fast) ease-(--ease) hover:opacity-90 active:opacity-75 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <span aria-hidden="true">{user.task_reminders ? "On" : "Off"}</span>
            <span aria-hidden="true" className="relative block h-6 w-10 rounded-full bg-muted-foreground">
              <span className={`absolute inset-0 rounded-full bg-brand transition-opacity duration-(--fast) ease-(--ease) motion-reduce:transition-none ${user.task_reminders ? "opacity-100" : "opacity-0"}`} />
              <span className={`absolute left-1 top-1 size-4 rounded-full bg-white transition-transform duration-(--fast) ease-(--ease) motion-reduce:transition-none ${user.task_reminders ? "translate-x-4" : "translate-x-0"}`} />
            </span>
          </button>
        </div>
        {params.reminderError && <p role="alert" className="mt-2 text-sm text-destructive">{params.reminderError}</p>}
      </form>
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
    <style>{`
      @keyframes task-reminder-highlight { from { opacity: 1; } to { opacity: 0; } }
      .task-reminder-highlight { animation: task-reminder-highlight calc(var(--fast) * 10) var(--ease) forwards; }
      @media (prefers-reduced-motion: reduce) { .task-reminder-highlight { animation: none; opacity: 0; } }
    `}</style>
  </div>;
}
