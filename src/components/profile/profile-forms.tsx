"use client";

import { useActionState } from "react";
import { setTaskRemindersAction, type ChecklistState } from "@/lib/actions/checklists";

export function ProfileRemindersForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(
    async (_previous: ChecklistState, form: FormData) => setTaskRemindersAction(form),
    { error: null },
  );

  return (
    <form action={action}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 id="task-reminders-label" className="text-sm font-medium">Morning email</h3>
          <p id="task-reminders-help" className="mt-1 text-xs text-muted-foreground">Tasks due today or overdue, at 7am</p>
        </div>
        <button type="submit" role="switch" aria-checked={enabled} aria-labelledby="task-reminders-label" aria-describedby="task-reminders-help"
          name="task_reminders" value={String(!enabled)} disabled={pending} aria-busy={pending}
          className="flex shrink-0 items-center gap-2 rounded-full p-1 text-xs transition-opacity duration-(--fast) ease-(--ease) hover:opacity-90 active:opacity-75 disabled:opacity-50 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <span aria-hidden="true">{enabled ? "On" : "Off"}</span>
          <span aria-hidden="true" className="relative block h-6 w-10 rounded-full bg-muted-foreground">
            <span className={`absolute inset-0 rounded-full bg-brand transition-opacity duration-(--fast) ease-(--ease) motion-reduce:transition-none ${enabled ? "opacity-100" : "opacity-0"}`} />
            <span className={`absolute left-1 top-1 size-4 rounded-full bg-white transition-transform duration-(--fast) ease-(--ease) motion-reduce:transition-none ${enabled ? "translate-x-4" : "translate-x-0"}`} />
          </span>
        </button>
      </div>
      {state.error && <p role="alert" className="qr-fade mt-2 text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
