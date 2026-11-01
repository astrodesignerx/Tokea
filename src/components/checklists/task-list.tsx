"use client";

import { useLayoutEffect, useOptimistic, useRef, useState, useTransition, type PointerEvent } from "react";
import * as actions from "@/lib/actions/checklists";
import type { Person, TaskItem } from "@/lib/checklists/types";
import { AddTask } from "./add-task";
import { TaskRow, type ItemOperation } from "./task-row";

type Optimistic = { items: TaskItem[]; removing?: string };
type Update = { type: "replace"; items: TaskItem[] } | { type: "remove"; id: string };
const handlers = {
  tick: actions.tickChecklistItemAction, untick: actions.untickChecklistItemAction,
  edit: actions.editChecklistItemAction, assign: actions.assignChecklistItemAction,
  due: actions.setChecklistDueAction, delete: actions.deleteChecklistItemAction,
};
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TaskList({ checklistId, items, members, userId, archived = false, compact = false }: {
  checklistId: string; items: TaskItem[]; members: Person[]; userId: string; archived?: boolean; compact?: boolean;
}) {
  const [optimistic, update] = useOptimistic<Optimistic, Update>({ items }, (state, change) => change.type === "replace" ? { items: change.items } : { ...state, removing: change.id });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const container = useRef<HTMLUListElement>(null);
  const previous = useRef(new Map<string, number>());
  const dragging = useRef<{ id: string; startY: number; element: HTMLElement; moved: boolean } | null>(null);

  // FLIP keeps moves on the compositor. Layout is measured only when rows change.
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    container.current?.querySelectorAll<HTMLElement>("[data-task-id]").forEach((element) => {
      const id = element.dataset.taskId!;
      const top = element.getBoundingClientRect().top;
      next.set(id, top);
      const old = previous.current.get(id);
      if (old !== undefined && old !== top && !reduced()) element.animate([
        { transform: `translateY(${old - top}px)` }, { transform: "translateY(0)" },
      ], { duration: 220, easing: "cubic-bezier(0.2,0,0,1)" });
    });
    previous.current = next;
  }, [optimistic.items]);

  function submit(action: (state: actions.ChecklistState, form: FormData) => Promise<actions.ChecklistState>, fields: Record<string, string>, next: TaskItem[], removing?: string): Promise<boolean> {
    setError(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        if (removing) {
          update({ type: "remove", id: removing });
          if (!reduced()) await new Promise((done) => setTimeout(done, 220));
        }
        update({ type: "replace", items: next });
        const form = new FormData();
        form.set("checklist_id", checklistId);
        for (const [key, text] of Object.entries(fields)) form.set(key, text);
        try {
          const state = await action({ error: null }, form);
          setError(state.error);
          resolve(!state.error);
        } catch {
          setError("The change could not be saved. Please try again.");
          resolve(false);
        }
      });
    });
  }

  function run(operation: ItemOperation, item: TaskItem, fields: Record<string, string> = {}): Promise<boolean> {
    if (pending || archived) return Promise.resolve(false);
    const patch: Partial<TaskItem> = operation === "tick" ? { done_at: new Date().toISOString(), done_by_id: userId, done_by_name: "you" }
      : operation === "untick" ? { done_at: null, done_by_id: null, done_by_name: null }
      : operation === "edit" ? { title: fields.title, notes: fields.notes || null }
      : operation === "assign" ? { assignee_id: fields.assignee_id || null }
      : operation === "due" ? { due_on: fields.due_on || null } : {};
    const next = operation === "delete" ? optimistic.items.filter((row) => row.id !== item.id) : optimistic.items.map((row) => row.id === item.id ? { ...row, ...patch } : row);
    return submit(handlers[operation], { ...fields, item_id: item.id }, next, operation === "delete" ? item.id : undefined);
  }

  function moveTo(item: TaskItem, index: number) {
    if (pending || archived || compact) return;
    const remaining = optimistic.items.filter((row) => row.id !== item.id);
    const safeIndex = Math.max(0, Math.min(index, remaining.length));
    const before = remaining[safeIndex - 1];
    const after = remaining[safeIndex];
    const next = [...remaining];
    next.splice(safeIndex, 0, item);
    void submit(actions.reorderChecklistItemAction, { item_id: item.id, before_id: before?.id || "", after_id: after?.id || "" }, next);
  }

  function drag(event: PointerEvent<HTMLButtonElement>, item: TaskItem, phase: "start" | "move" | "end" | "cancel") {
    if (phase === "start") {
      if (!event.isPrimary || event.button !== 0 || pending || archived) return;
      const element = event.currentTarget.closest<HTMLElement>("[data-task-id]");
      if (!element) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = { id: item.id, startY: event.clientY, element, moved: false };
      return;
    }
    const active = dragging.current;
    if (!active || active.id !== item.id) return;
    if (phase === "move") {
      const offset = event.clientY - active.startY;
      if (Math.abs(offset) > 5) active.moved = true;
      if (active.moved) {
        active.element.style.transform = `translateY(${offset}px)`;
        active.element.style.zIndex = "10";
        active.element.dataset.dragging = "true";
      }
      return;
    }
    const others = Array.from(container.current?.querySelectorAll<HTMLElement>("[data-task-id]") || []).filter((element) => element.dataset.taskId !== item.id);
    const target = others.filter((element) => {
      const rect = element.getBoundingClientRect();
      return event.clientY > rect.top + rect.height / 2;
    }).length;
    active.element.style.transform = "";
    active.element.style.zIndex = "";
    delete active.element.dataset.dragging;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (phase === "end" && active.moved && target !== optimistic.items.findIndex((row) => row.id === item.id)) moveTo(item, target);
  }

  return <div aria-busy={pending}>
    {!archived && !compact && <AddTask disabled={pending || optimistic.items.length >= 500} onAdd={(title, kind) => {
      const draft: TaskItem = { id: `new-${Date.now()}`, checklist_id: checklistId, kind, title, notes: null,
        position: (optimistic.items.at(-1)?.position || 0) + 1024, assignee_id: null, due_on: null, done_at: null, done_by_id: null, done_by_name: null };
      return submit(actions.addChecklistItemAction, { title, kind }, [...optimistic.items, draft]);
    }} />}
    {error && <p role="alert" className="qr-fade border-b bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <ul ref={container} className="cl-items" aria-label={compact ? "Your task" : "List items"}>
      {optimistic.items.map((item, index) => <li key={item.id} data-task-id={item.id} className={`cl-list-item qr-rise ${optimistic.removing === item.id ? "cl-removing" : ""}`}>
        <TaskRow item={item} members={members} disabled={pending} archived={archived} compact={compact}
          first={index === 0} last={index === optimistic.items.length - 1} onRun={run}
          onMove={(row, direction) => moveTo(row, index + direction)} onDrag={drag} />
      </li>)}
    </ul>
    {!optimistic.items.length && <p className="p-8 text-center text-sm text-muted-foreground">{archived ? "This list has no tasks." : "Start with a task or a heading. Your changes are saved as you go."}</p>}
    {!compact && optimistic.items.length >= 500 && <p className="p-3 text-xs text-muted-foreground">This list has 500 items. Remove an item before adding another.</p>}
    <span className="sr-only" role="status">{pending ? "Saving changes" : ""}</span>
  </div>;
}
