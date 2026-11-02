"use client";

import { useLayoutEffect, useOptimistic, useRef, useState, useTransition, type PointerEvent } from "react";
import * as actions from "@/lib/actions/checklists";
import type { Person, TaskItem } from "@/lib/checklists/types";
import { groupSubtasks } from "@/lib/checklists/hierarchy";
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
const timing = (element: HTMLElement) => {
  const style = getComputedStyle(element);
  const duration = style.getPropertyValue("--cl-duration").trim();
  return { duration: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000), easing: style.getPropertyValue("--cl-ease").trim() };
};

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
      ], timing(element));
    });
    previous.current = next;
  }, [optimistic.items]);

  function submit(action: (state: actions.ChecklistState, form: FormData) => Promise<actions.ChecklistState>, fields: Record<string, string>, next: TaskItem[], removing?: string): Promise<boolean> {
    setError(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        if (removing) {
          update({ type: "remove", id: removing });
          if (!reduced() && container.current) await new Promise((done) => setTimeout(done, timing(container.current!).duration));
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
    const next = operation === "delete" ? optimistic.items.filter((row) => row.id !== item.id && row.parent_id !== item.id) : optimistic.items.map((row) => row.id === item.id ? { ...row, ...patch } : row);
    const confirmation: Record<string, string> = operation === "delete" ? { subtask_count: String(optimistic.items.filter((row) => row.parent_id === item.id).length) } : {};
    return submit(handlers[operation], { ...fields, ...confirmation, item_id: item.id }, next, operation === "delete" ? item.id : undefined);
  }

  function moveTo(item: TaskItem, index: number) {
    if (pending || archived || compact) return;
    const siblings = optimistic.items.filter((row) => row.parent_id === item.parent_id);
    const remaining = siblings.filter((row) => row.id !== item.id);
    const safeIndex = Math.max(0, Math.min(index, remaining.length));
    const before = remaining[safeIndex - 1];
    const after = remaining[safeIndex];
    const ordered = [...remaining];
    ordered.splice(safeIndex, 0, item);
    let siblingIndex = 0;
    const next = optimistic.items.map((row) => row.parent_id === item.parent_id ? ordered[siblingIndex++] : row);
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
    const others = Array.from(container.current?.querySelectorAll<HTMLElement>("[data-task-id]") || []).filter((element) => element.dataset.taskId !== item.id && element.dataset.parentId === (item.parent_id || ""));
    const target = others.filter((element) => {
      const rect = element.getBoundingClientRect();
      return event.clientY > rect.top + rect.height / 2;
    }).length;
    active.element.style.transform = "";
    active.element.style.zIndex = "";
    delete active.element.dataset.dragging;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (phase === "end" && active.moved && target !== optimistic.items.filter((row) => row.parent_id === item.parent_id).findIndex((row) => row.id === item.id)) moveTo(item, target);
  }

  function add(title: string, kind: string, parentId: string | null = null) {
    if (pending || archived || optimistic.items.length >= 500) return Promise.resolve(false);
    const siblings = optimistic.items.filter((item) => item.parent_id === parentId);
    const draft: TaskItem = { id: `new-${Date.now()}`, checklist_id: checklistId, parent_id: parentId, kind, title, notes: null,
      position: (siblings.at(-1)?.position || 0) + 1024, assignee_id: null, due_on: null, done_at: null, done_by_id: null, done_by_name: null };
    return submit(actions.addChecklistItemAction, { title, kind, parent_id: parentId || "" }, [...optimistic.items, draft]);
  }
  const displayed = compact ? optimistic.items : groupSubtasks(optimistic.items);

  return <div aria-busy={pending}>
    {!archived && !compact && <AddTask disabled={pending || optimistic.items.length >= 500} onAdd={add} />}
    {error && <p role="alert" className="qr-fade border-b bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <ul ref={container} className="cl-items" aria-label={compact ? "Your task" : "List items"}>
      {displayed.map((item) => {
        const siblings = optimistic.items.filter((row) => row.parent_id === item.parent_id);
        const index = siblings.findIndex((row) => row.id === item.id);
        const children = optimistic.items.filter((row) => row.parent_id === item.id);
        return <li key={item.id} data-task-id={item.id} data-parent-id={item.parent_id || ""}
          className={`cl-list-item qr-rise ${!compact && item.parent_id ? "ml-5 border-l sm:ml-10" : ""} ${optimistic.removing === item.id || (item.parent_id && optimistic.removing === item.parent_id) ? "cl-removing" : ""}`}>
          <TaskRow item={item} members={members} disabled={pending} archived={archived} compact={compact}
            childCount={children.length} childDone={children.filter((row) => row.done_at).length}
            canAddSubtask={optimistic.items.length < 500} onAddSubtask={(title) => add(title, "task", item.id)}
            first={index === 0} last={index === siblings.length - 1} onRun={run}
            onMove={(row, direction) => moveTo(row, index + direction)} onDrag={drag} />
        </li>;
      })}
    </ul>
    {!optimistic.items.length && <p className="p-8 text-center text-sm text-muted-foreground">{archived ? "This list has no tasks." : "Start with a task or a heading. Your changes are saved as you go."}</p>}
    {!compact && optimistic.items.length >= 500 && <p className="p-3 text-xs text-muted-foreground">This list has 500 items. Remove an item before adding another.</p>}
    <span className="sr-only" role="status">{pending ? "Saving changes" : ""}</span>
  </div>;
}
