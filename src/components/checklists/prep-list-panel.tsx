"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { createEventPrepListAction } from "@/lib/actions/checklists";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PrepList = { id: string; title: string; archived: boolean; total: number; done: number };

export function PrepListPanel({ eventId, list }: { eventId: string; list: PrepList | null }) {
  const [state, action, pending] = useActionState(createEventPrepListAction, { error: null });
  return <section className="qr-rise">
    <h2 className="nf-eyebrow">Prep list</h2>
    <div className="nf-panel mt-4 space-y-3 p-6" aria-busy={pending}>
      {list ? <div className="qr-fade space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 break-words text-sm font-medium">{list.title}</p>
          {list.archived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{list.done} of {list.total} done</p>
        <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Prep tasks completed" aria-valuenow={list.done} aria-valuemin={0} aria-valuemax={list.total || 1}>
          <div className="h-full w-full origin-left bg-brand transition-transform duration-(--fast) ease-(--ease) motion-reduce:transition-none" style={{ transform: `scaleX(${list.total ? list.done / list.total : 0})` }} />
        </div>
        <Button asChild variant="outline" size="sm"><Link href={`/dashboard/checklists/${list.id}`}><ListChecks className="size-4" />Open</Link></Button>
      </div> : <form action={action} className="space-y-3">
        <input type="hidden" name="event_id" value={eventId} />
        <p className="text-sm text-muted-foreground">Plan the event with a personal checklist and five starter tasks.</p>
        <Button type="submit" disabled={pending}><Plus className="size-4" />{pending ? "Creating…" : "Create prep list"}</Button>
      </form>}
      {state.error && <p className="qr-fade text-sm text-destructive" role="alert">{state.error}</p>}
    </div>
  </section>;
}
