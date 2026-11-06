"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveTodoAction, deleteTodoListAction } from "@/lib/actions/todo";
import type { TodoEditorValue } from "@/lib/todo/validation";
import { FormSection } from "@/components/qr-codes/form-section";
import { CoverUpload } from "@/components/event/cover-upload";
import { Button } from "@/components/ui/button";

export function TodoEditor({ id, initial, organisations, saved = false }: {
  id: string | null; initial: TodoEditorValue; organisations: { id: string; name: string }[]; saved?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({ basics: true });
  const [state, action, pending] = useActionState(saveTodoAction.bind(null, id), { error: null });
  const [deletion, deleteAction, deleting] = useActionState(deleteTodoListAction, { error: null });
  const root = useRef<HTMLDivElement>(null);
  function update(patch: Partial<TodoEditorValue>) { setValue((v) => ({ ...v, ...patch })); }
  function move(patch: Partial<TodoEditorValue>) {
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-todo-move]");
    const previous = new Map<string, number>();
    nodes?.forEach((node) => previous.set(node.dataset.todoMove!, node.getBoundingClientRect().top));
    update(patch);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
      if (!root.current) return;
      const tokens = getComputedStyle(root.current);
      root.current.querySelectorAll<HTMLElement>("[data-todo-move]").forEach((node) => {
        const before = previous.get(node.dataset.todoMove!);
        if (before === undefined) return;
        const distance = before - node.getBoundingClientRect().top;
        if (Math.abs(distance) < 1) return;
        node.animate([{ transform: `translateY(${distance}px)`, opacity: .7 }, { transform: "none", opacity: 1 }], {
          duration: parseFloat(tokens.getPropertyValue("--dur-2")) || 220,
          easing: tokens.getPropertyValue("--ease-out").trim() || "ease-out",
        });
      });
    });
  }
  function section(key: string, title: string, summary: string, children: React.ReactNode) {
    return <FormSection id={`todo-${key}`} title={title} summary={summary} open={!!open[key] || !!state.error} onToggle={() => setOpen((s) => ({ ...s, [key]: !s[key] }))}>{children}</FormSection>;
  }
  function patchItem(itemId: string, patch: Partial<TodoEditorValue["items"][number]>) {
    setValue((v) => ({ ...v, items: v.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }));
  }
  function reorderSection(index: number, direction: number) {
    const sections = [...value.sections];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    move({ sections });
  }
  function reorderItem(itemId: string, direction: number) {
    const items = [...value.items];
    const index = items.findIndex((i) => i.id === itemId);
    const peers = items.filter((i) => i.section_id === items[index].section_id);
    const target = peers[peers.findIndex((i) => i.id === itemId) + direction];
    if (!target) return;
    const targetIndex = items.findIndex((i) => i.id === target.id);
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    move({ items });
  }
  function addItem(sectionId: string) {
    update({ items: [...value.items, { id: `new:${crypto.randomUUID()}`, section_id: sectionId, name: "", note: "", image_url: "", price: "", per_unit: false, unit_label: "", max_quantity: 20, active: true }] });
  }
  const groups = [...value.sections, { id: "", title: "Other services" }];
  return <div ref={root} className="todo-editor mt-6">
    <form action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(value)} />
      <fieldset disabled={pending} className="min-w-0">
        <div className="nf-panel divide-y">
          {section("basics", "Basics", `${value.title || "Untitled"}, ${value.status}`, <>
            <label>Title<input value={value.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} /></label>
            <label>Intro<textarea value={value.intro} maxLength={2000} rows={3} onChange={(e) => update({ intro: e.target.value })} /></label>
            <label>Business branding<select value={value.organisation_id} onChange={(e) => update({ organisation_id: e.target.value })}><option value="">NikoForm theme</option>{organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
            <label>Status<select value={value.status} onChange={(e) => update({ status: e.target.value as TodoEditorValue["status"] })}>{["draft", "open", "closed", "archived"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></label>
            <p className="text-xs text-muted-foreground">Draft is visible only to you. Open accepts requests. Closed shows a message. Archived hides the page.</p>
          </>)}
          {section("layout", "Layout", `${value.layout === "list" ? "List" : "Visual"}${value.allow_view_switch ? ", clients can switch" : ""}`, <>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Client layout">
              {(["list", "visual"] as const).map((layout) => <button key={layout} type="button" aria-pressed={value.layout === layout} onClick={() => update({ layout })} className={`grid gap-2 rounded-xl border p-3 text-left ${value.layout === layout ? "border-primary ring-1 ring-primary" : ""}`}>
                <span className="todo-layout-mini" data-layout={layout} aria-hidden="true">{Array.from({ length: layout === "list" ? 4 : 3 }, (_, i) => <i key={i} />)}</span>
                <strong className="text-sm">{layout === "list" ? "List" : "Visual"}</strong>
                <span className="text-xs text-muted-foreground">{layout === "list" ? "A simple tick list" : "Photo cards for each service"}</span>
              </button>)}
            </div>
            <label className="todo-switch"><input type="checkbox" checked={value.allow_view_switch} onChange={(e) => update({ allow_view_switch: e.target.checked })} />Let clients switch view</label>
          </>)}
          {section("prices", "Prices", value.show_prices ? "Shown, KES" : "Off", <>
            <label className="todo-switch"><input type="checkbox" checked={value.show_prices} onChange={(e) => update({ show_prices: e.target.checked })} />Show prices</label>
            <p className="text-xs text-muted-foreground">Optional. When on, clients see prices and a running estimate.</p>
            <p className="text-xs text-muted-foreground">Prices are in KES. Saved prices are kept when switched off.</p>
          </>)}
          {section("questions", "Questions", value.ask_event_date ? "Ask event date" : "Contact details only", <label className="todo-switch"><input type="checkbox" checked={value.ask_event_date} onChange={(e) => update({ ask_event_date: e.target.checked })} />Ask event date</label>)}
          {section("notifications", "Notifications", value.notify_emails.some((email) => email.trim()) ? "Custom addresses" : "Your account email", <>
            <label>Email addresses<textarea value={value.notify_emails.join("\n")} rows={3} onChange={(e) => update({ notify_emails: e.target.value.split("\n") })} onBlur={() => update({ notify_emails: value.notify_emails.join("\n").split(/[\s,;]+/).filter(Boolean) })} /></label>
            <p className="text-xs text-muted-foreground">Up to 5 addresses, one per line. Leave empty to use your account email. Emails contain a link to the request.</p>
          </>)}
          {section("thanks", "Thank-you message", value.thank_you ? "Custom message" : "Default message", <label>Message<textarea value={value.thank_you} maxLength={2000} rows={3} placeholder="Thanks. We will get back to you shortly." onChange={(e) => update({ thank_you: e.target.value })} /></label>)}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-medium">Services</h2><p className="mt-1 text-xs text-muted-foreground">Group services into sections. Changes go live when you save.</p></div>
          <Button type="button" variant="outline" disabled={value.sections.length >= 30} onClick={() => update({ sections: [...value.sections, { id: `new:${crypto.randomUUID()}`, title: "New section" }] })}><Plus size={16} />Add section</Button>
        </div>
        {groups.map((group, groupIndex) => {
          const items = value.items.filter((i) => i.section_id === group.id);
          return <section key={group.id} data-todo-move={`section:${group.id}`} className="todo-rise mt-5 rounded-xl border bg-card p-4" aria-label={group.title}>
            {group.id ? <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">Section title<input value={group.title} maxLength={120} onChange={(e) => update({ sections: value.sections.map((s) => s.id === group.id ? { ...s, title: e.target.value } : s) })} /></label>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move section ${group.title} up`} disabled={groupIndex === 0} onClick={() => reorderSection(groupIndex, -1)}><ArrowUp size={16} /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move section ${group.title} down`} disabled={groupIndex === value.sections.length - 1} onClick={() => reorderSection(groupIndex, 1)}><ArrowDown size={16} /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete section ${group.title}`} onClick={() => update({ sections: value.sections.filter((s) => s.id !== group.id), items: value.items.map((i) => i.section_id === group.id ? { ...i, section_id: "" } : i) })}><Trash2 size={16} /></Button>
            </div> : <h3 className="font-medium">{value.sections.length ? "Other services" : "Services"}</h3>}
            {items.map((item, itemIndex) => <div key={item.id} data-todo-move={`item:${item.id}`} className="todo-rise mt-4 space-y-3 rounded-lg border p-3">
              <div className="flex items-end gap-1">
                <label className="min-w-0 flex-1">Service name<input value={item.name} maxLength={160} onChange={(e) => patchItem(item.id, { name: e.target.value })} /></label>
                <Button type="button" size="icon" variant="ghost" aria-label={`Move ${item.name || "service"} up`} disabled={itemIndex === 0} onClick={() => reorderItem(item.id, -1)}><ArrowUp size={16} /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Move ${item.name || "service"} down`} disabled={itemIndex === items.length - 1} onClick={() => reorderItem(item.id, 1)}><ArrowDown size={16} /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${item.name || "service"}`} onClick={() => update({ items: value.items.filter((i) => i.id !== item.id) })}><Trash2 size={16} /></Button>
              </div>
              <label>Note<textarea value={item.note} maxLength={500} rows={2} onChange={(e) => patchItem(item.id, { note: e.target.value })} /></label>
              <label>Section<select value={item.section_id} onChange={(e) => patchItem(item.id, { section_id: e.target.value })}><option value="">No section</option>{value.sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
              <div><p className="mb-2 text-xs font-medium">Photo (optional)</p><CoverUpload value={item.image_url || null} onChange={(url) => patchItem(item.id, { image_url: url || "" })} /></div>
              {value.show_prices && <label>Price in KES (optional)<input inputMode="decimal" value={item.price} onChange={(e) => patchItem(item.id, { price: e.target.value })} placeholder="Leave empty for no price" /></label>}
              <label className="todo-switch"><input type="checkbox" checked={item.per_unit} onChange={(e) => patchItem(item.id, { per_unit: e.target.checked })} />Per unit</label>
              {item.per_unit && <div className="todo-rise grid gap-3 sm:grid-cols-2">
                <label>Unit label<input value={item.unit_label} maxLength={40} placeholder="tables" onChange={(e) => patchItem(item.id, { unit_label: e.target.value })} /></label>
                <label>Maximum quantity<input type="number" min={1} max={1000} value={item.max_quantity} onChange={(e) => patchItem(item.id, { max_quantity: Number(e.target.value) })} /></label>
              </div>}
              <label className="todo-switch"><input type="checkbox" checked={item.active} onChange={(e) => patchItem(item.id, { active: e.target.checked })} />Active, shown to clients</label>
            </div>)}
            <Button type="button" className="mt-4" variant="outline" disabled={value.items.length >= 200} onClick={() => addItem(group.id)}><Plus size={16} />Add service</Button>
          </section>;
        })}
      </fieldset>
      <div className="sticky bottom-3 z-20 mt-6 flex items-center justify-between gap-4 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <p role="status" className={`text-sm ${state.error ? "text-destructive" : "text-muted-foreground"}`}>{state.error || (saved ? "Saved. Changes are live when the list is open." : "Save your changes when ready.")}</p>
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : id ? "Save changes" : "Create list"}</Button>
      </div>
    </form>
    {id && <form action={deleteAction} className="mt-8">
      <input type="hidden" name="list_id" value={id} />
      <p className="mb-3 text-xs text-muted-foreground">Lists with requests must be archived. Empty lists can be deleted permanently.</p>
      <Button type="submit" variant="destructive" disabled={deleting} onClick={(e) => { if (!window.confirm("Permanently delete this empty list?")) e.preventDefault(); }}>Delete empty list</Button>
      {deletion.error && <p role="alert" className="mt-3 text-sm text-destructive">{deletion.error}</p>}
    </form>}
  </div>;
}
