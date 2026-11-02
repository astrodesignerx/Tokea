"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddTask({ disabled, onAdd }: { disabled: boolean; onAdd: (title: string, kind: string) => Promise<boolean> }) {
  const formRef = useRef<HTMLFormElement>(null);
  return <form ref={formRef} className="flex flex-wrap items-center gap-2 border-b p-4" onSubmit={async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get("title") ?? "").trim();
    if (title && await onAdd(title, String(fields.get("kind")))) {
      form.reset();
      formRef.current?.querySelector("input")?.focus();
    }
  }}>
    <label className="sr-only" htmlFor="new-task-kind">Item type</label>
    <select id="new-task-kind" name="kind" className="cl-input text-sm" disabled={disabled}><option value="task">Task</option><option value="heading">Heading</option></select>
    <label className="sr-only" htmlFor="new-task-title">Add an item</label>
    <Input id="new-task-title" name="title" placeholder="Add a task" required maxLength={200} className="min-w-32 flex-1" disabled={disabled} />
    <Button type="submit" size="sm" variant="ghost" disabled={disabled}><Plus className="size-4" />Add</Button>
  </form>;
}
