"use client";

import { useState, type PointerEvent } from "react";
import { Check, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { canHaveSubtasks } from "@/lib/checklists/hierarchy";
import type { Person, TaskItem } from "@/lib/checklists/types";
import { dueState } from "@/lib/checklists/due-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { AnimatedReveal } from "./animated-reveal";

export type ItemOperation = "tick" | "untick" | "edit" | "assign" | "due" | "delete";
export type RunItem = (operation: ItemOperation, item: TaskItem, fields?: Record<string, string>) => Promise<boolean>;

export function TaskRow({ item, members, disabled, archived, compact, first, last, onRun, onMove, onDrag, childCount, childDone, canAddSubtask, onAddSubtask }: {
  item: TaskItem; members: Person[]; disabled: boolean; archived: boolean; compact?: boolean;
  first: boolean; last: boolean; onRun: RunItem; onMove: (item: TaskItem, direction: number) => void;
  onDrag: (event: PointerEvent<HTMLButtonElement>, item: TaskItem, phase: "start" | "move" | "end" | "cancel") => void;
  childCount: number; childDone: number; canAddSubtask: boolean; onAddSubtask: (title: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const done = !!item.done_at;
  const assignee = members.find((person) => person.user_id === item.assignee_id);
  const assigneeName = assignee ? assignee.user.name || assignee.user.email : item.assignee_id ? "Former member" : "Unassigned";
  const initials = assigneeName.split(/[\s@]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const due = dueState(item.due_on);
  const dateLabel = item.due_on ? new Date(`${item.due_on}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "";
  const heading = item.kind === "heading";
  const locked = disabled || archived;

  return <div className={`cl-row ${heading ? "cl-heading" : ""}`} data-done={done}>
    {!compact && <button type="button" className="cl-grip" disabled={locked} aria-label={`Drag to reorder ${item.title}. You can also use Move up or Move down in the menu.`}
      onPointerDown={(event) => onDrag(event, item, "start")} onPointerMove={(event) => onDrag(event, item, "move")}
      onPointerUp={(event) => onDrag(event, item, "end")} onPointerCancel={(event) => onDrag(event, item, "cancel")}><GripVertical className="size-4" /></button>}
    {!heading && <button type="button" className="cl-tick" aria-label={`${done ? "Mark not done" : "Mark done"}: ${item.title}`} aria-pressed={done} disabled={locked}
      onClick={() => void onRun(done ? "untick" : "tick", item)}><span className="cl-tick-fill" /><Check className="cl-check size-3.5" aria-hidden="true" /></button>}
    <div className="min-w-0 flex-1">
      {editing ? <form className="qr-fade space-y-2 py-2" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (await onRun("edit", item, { title: String(form.get("title")), notes: String(form.get("notes")) })) setEditing(false);
      }}>
        <label className="sr-only" htmlFor={`title-${item.id}`}>Title</label>
        <Input id={`title-${item.id}`} name="title" defaultValue={item.title} maxLength={200} required autoFocus disabled={disabled} />
        <label className="sr-only" htmlFor={`notes-${item.id}`}>Notes</label>
        <textarea id={`notes-${item.id}`} name="notes" className="cl-input w-full text-sm" defaultValue={item.notes || ""} maxLength={2000} placeholder="Add notes" rows={3} disabled={disabled} />
        <div className="flex gap-2"><Button size="sm" disabled={disabled}>{disabled ? "Saving…" : "Save"}</Button><Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setEditing(false)}>Cancel</Button></div>
      </form> : <>
        <button className="cl-title text-left" disabled={locked || compact} onClick={() => setEditing(true)} aria-label={`Edit ${item.title}`}><span>{item.title}</span></button>
        {item.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">{item.notes}</p>}
        {!!childCount && <p className="qr-fade mt-1 text-xs text-muted-foreground" aria-label={`${childDone} of ${childCount} sub-tasks done`}>{childDone} of {childCount}</p>}
        {done && <p className="mt-1 text-xs text-muted-foreground">Done by {item.done_by_name || "a former member"}, {new Date(item.done_at!).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}</p>}
        {!heading && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {item.due_on && <span className={`cl-due cl-due-${done ? "later" : due}`} title={`Due ${item.due_on} (Nairobi)`}>{due === "today" && !done ? "Due today" : due === "overdue" && !done ? `Overdue: ${dateLabel}` : dateLabel}</span>}
          {!compact && <span className="text-muted-foreground" title={assigneeName}>{item.assignee_id ? <span className="cl-avatar">{initials}</span> : "Unassigned"} {item.assignee_id && assigneeName}</span>}
        </div>}
      </>}
      <AnimatedReveal open={addingChild && !archived}><form className="mt-3 space-y-2" onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const title = String(new FormData(form).get("title") || "").trim();
        if (title && await onAddSubtask(title)) { setAddingChild(false); form.reset(); }
      }}>
        <label className="sr-only" htmlFor={`subtask-${item.id}`}>Sub-task for {item.title}</label>
        <Input id={`subtask-${item.id}`} name="title" placeholder="Sub-task title" required maxLength={200} data-reveal-focus disabled={disabled} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={disabled}>{disabled ? "Adding…" : "Add sub-task"}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setAddingChild(false)}>Cancel</Button>
        </div>
      </form></AnimatedReveal>
    </div>
    {!compact && !archived && <details className="cl-menu relative self-start">
      <summary className="cl-icon-button list-none cursor-pointer" aria-label={`Options for ${item.title}`}><MoreHorizontal className="size-4" /></summary>
      <div className="cl-menu-body nf-panel space-y-2 p-3">
        <Button size="sm" variant="ghost" className="w-full justify-start" disabled={disabled} onClick={() => setEditing(true)}><Pencil className="size-3" />Edit {heading ? "heading" : "task"}</Button>
        {canHaveSubtasks(item) && <Button type="button" size="sm" variant="ghost" className="w-full justify-start" disabled={disabled || !canAddSubtask} onClick={(event) => {
          event.currentTarget.closest("details")?.removeAttribute("open");
          setAddingChild(true);
        }}><Plus className="size-3" />Add sub-task</Button>}
        {!heading && <>
          <label className="block text-xs">Assign to
            <select className="cl-input mt-1 w-full" value={item.assignee_id || ""} disabled={disabled} onChange={(event) => void onRun("assign", item, { assignee_id: event.target.value })}>
              <option value="">Unassigned</option>{!assignee && item.assignee_id && <option value={item.assignee_id}>Former member</option>}
              {members.map((person) => <option key={person.user_id} value={person.user_id}>{person.user.name || person.user.email}</option>)}
            </select>
          </label>
          <label className="block text-xs">Due date (Nairobi)<input type="date" className="cl-input mt-1 w-full" value={item.due_on || ""} disabled={disabled} onChange={(event) => void onRun("due", item, { due_on: event.target.value })} /></label>
        </>}
        <Button type="button" size="sm" variant="ghost" className="w-full justify-start" disabled={disabled || first} onClick={() => onMove(item, -1)}>Move up</Button>
        <Button type="button" size="sm" variant="ghost" className="w-full justify-start" disabled={disabled || last} onClick={() => onMove(item, 1)}>Move down</Button>
        <HoldToConfirm label={`Hold to delete ${heading ? "heading" : "task"}${childCount ? ` and ${childCount} sub-task${childCount === 1 ? "" : "s"}` : ""}`} className="h-auto min-h-9 whitespace-normal text-left" icon={<Trash2 className="size-4" />} disabled={disabled} onConfirm={async () => {
          if (!await onRun("delete", item)) throw new Error(`Could not delete ${heading ? "heading" : "task"}.`);
        }} />
      </div>
    </details>}
  </div>;
}
