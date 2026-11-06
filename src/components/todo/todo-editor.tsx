"use client";

import { useActionState, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, ChevronUp, Eye, ImagePlus, Maximize2, Pencil, Plus, Save, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { saveTodoAction, deleteTodoListAction } from "@/lib/actions/todo";
import { editorSchema, type TodoEditorValue } from "@/lib/todo/validation";
import { LIST_STATUSES } from "@/lib/todo/logic";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { CoverUpload } from "@/components/event/cover-upload";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Segmented } from "@/components/ui/segmented";
import { TodoEditorPreview, type TodoOrganisation } from "./todo-editor-preview";
import "./todo-editor.css";

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "services", label: "Services" },
  { id: "details", label: "Client details" },
  { id: "sending", label: "After sending" },
] as const;
type Tab = typeof TABS[number]["id"];
type Item = TodoEditorValue["items"][number];

export function TodoEditor({ id, initial, organisations, businessName = "NikoForm", publicUrl, saved = false }: {
  id: string | null;
  initial: TodoEditorValue;
  organisations: TodoOrganisation[];
  businessName?: string;
  publicUrl?: string;
  saved?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [tab, setTab] = useState<Tab>("services");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [invalidPrice, setInvalidPrice] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState("phone");
  const [state, action, pending] = useActionState(saveTodoAction.bind(null, id), { error: null });
  const [deletion, deleteAction, deleting] = useActionState(deleteTodoListAction, { error: null });
  const root = useRef<HTMLDivElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);
  const prefix = useId();
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const organisation = organisations.find((org) => org.id === value.organisation_id);
  const groups = [...value.sections, { id: "", title: value.sections.length ? "Other services" : "Services" }];
  const activeCount = value.items.filter((item) => item.active).length;
  const message = clientError || state.error;

  useEffect(() => { if (state.error) error.current?.focus(); }, [state]);

  function fieldId(kind: string, key = "") { return prefix + "-" + kind + (key ? "-" + key : ""); }
  function focusField(kind: string, key = "") {
    requestAnimationFrame(() => document.getElementById(fieldId(kind, key))?.focus());
  }
  function update(patch: Partial<TodoEditorValue>) {
    setClientError(null);
    setValue((current) => ({ ...current, ...patch }));
  }
  function patchItem(itemId: string, patch: Partial<Item>) {
    setClientError(null);
    setValue((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }));
  }
  function chooseTab(next: Tab) {
    setTab(next);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
      const panel = document.getElementById(fieldId("panel", next));
      const tokens = root.current && getComputedStyle(root.current);
      panel?.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], {
        duration: parseFloat(tokens?.getPropertyValue("--dur-2") || "") || 220,
        easing: tokens?.getPropertyValue("--ease-out").trim() || "ease-out",
      });
    });
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    chooseTab(TABS[next].id);
    document.getElementById(fieldId("tab", TABS[next].id))?.focus();
  }
  function move(patch: Partial<TodoEditorValue>) {
    const positions = new Map<string, number>();
    root.current?.querySelectorAll<HTMLElement>("[data-todo-move]").forEach((node) => positions.set(node.dataset.todoMove!, node.getBoundingClientRect().top));
    update(patch);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
      if (!root.current) return;
      const tokens = getComputedStyle(root.current);
      root.current.querySelectorAll<HTMLElement>("[data-todo-move]").forEach((node) => {
        const before = positions.get(node.dataset.todoMove!);
        if (before === undefined) return;
        const distance = before - node.getBoundingClientRect().top;
        if (Math.abs(distance) < 1) return;
        node.animate([{ transform: "translateY(" + distance + "px)", opacity: .7 }, { transform: "none", opacity: 1 }], {
          duration: parseFloat(tokens.getPropertyValue("--dur-2")) || 220,
          easing: tokens.getPropertyValue("--ease-out").trim() || "ease-out",
        });
      });
    });
  }
  function reorderSection(index: number, direction: number) {
    const sections = [...value.sections];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    move({ sections });
  }
  function reorderItem(item: Item, direction: number) {
    const items = [...value.items];
    const peers = items.filter((peer) => peer.section_id === item.section_id);
    const target = peers[peers.findIndex((peer) => peer.id === item.id) + direction];
    if (!target) return;
    const a = items.findIndex((peer) => peer.id === item.id);
    const b = items.findIndex((peer) => peer.id === target.id);
    [items[a], items[b]] = [items[b], items[a]];
    move({ items });
  }
  function editItem(itemId: string) {
    previewTrigger.current = null;
    previewDialog.current?.close();
    chooseTab("services");
    setExpanded(itemId);
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId("name", itemId));
      field?.scrollIntoView({ block: "nearest" });
      field?.focus({ preventScroll: true });
    });
  }
  function addItem(sectionId: string) {
    const itemId = "new:" + crypto.randomUUID();
    update({ items: [...value.items, { id: itemId, section_id: sectionId, name: "", note: "", image_url: "", price: "", per_unit: false, unit_label: "", max_quantity: 20, active: true }] });
    setExpanded(itemId);
    focusField("name", itemId);
  }
  function addSection() {
    const sectionId = "new:" + crypto.randomUUID();
    update({ sections: [...value.sections, { id: sectionId, title: "New section" }] });
    focusField("section", sectionId);
  }
  function openPreview(trigger: HTMLElement, mode = "phone") {
    previewTrigger.current = trigger;
    setPreviewMode(mode);
    previewDialog.current?.showModal();
  }
  function preflight(event: FormEvent<HTMLFormElement>) {
    const parsed = editorSchema.safeParse(value);
    const badPrice = value.items.find((item) => item.price.trim() && toMinorUnits(item.price) === null);
    if (parsed.success && !badPrice) { setClientError(null); return; }
    event.preventDefault();
    const issue = !parsed.success ? parsed.error.issues[0] : null;
    setClientError(issue?.message || "Use a positive price or zero, with at most two decimal places.");
    if (issue?.path[0] === "title" || issue?.path[0] === "organisation_id") {
      chooseTab("basics"); focusField(issue.path[0] === "title" ? "title" : "organisation");
    } else if (issue?.path[0] === "notify_emails" || issue?.path[0] === "thank_you") {
      chooseTab("sending"); focusField(issue.path[0] === "thank_you" ? "thanks" : "emails");
    } else if (issue?.path[0] === "sections") {
      chooseTab("services"); focusField("section", value.sections[Number(issue.path[1])]?.id);
    } else if (issue?.path[0] === "items" && typeof issue.path[1] === "number") {
      const item = value.items[issue.path[1]];
      chooseTab("services"); setExpanded(item.id);
      focusField(issue.path[2] === "max_quantity" ? "quantity" : "name", item.id);
    } else if (badPrice) {
      chooseTab("services"); setExpanded(badPrice.id); setInvalidPrice(badPrice.id); focusField("price", badPrice.id);
    } else {
      chooseTab("services"); requestAnimationFrame(() => error.current?.focus());
    }
  }
  const preview = (wide = false) => <TodoEditorPreview value={value} organisation={organisation} businessName={businessName} wide={wide} onEdit={editItem} />;

  return <div ref={root} className="todo-editor-a">
    <form action={action} onSubmit={preflight} aria-busy={pending} noValidate>
      <input type="hidden" name="payload" value={JSON.stringify(value)} />
      <fieldset disabled={pending}>
        <header className="te-topbar">
          <div className="te-heading">
            <span className="te-kicker">TO-DO / SERVICE BUILDER</span>
            <h1>{value.title.trim() || "New to-do list"}</h1>
            <span className="te-save-state" role="status">
              <span data-dirty={dirty} />{pending ? "Saving..." : dirty ? "Unsaved changes" : id ? "Saved" : "Start with your services"}
            </span>
          </div>
          <div className="te-header-actions">
            <Button type="button" variant="outline" className="te-mobile-preview" onClick={(event) => openPreview(event.currentTarget)}><Eye size={16} />Preview</Button>
            {publicUrl && <div className="te-copy"><CopyButton value={publicUrl} /><span>Copy link</span></div>}
            <Button type="submit"><Save size={15} />{pending ? "Saving..." : id ? "Save changes" : value.status === "open" ? "Create open list" : "Create list"}</Button>
          </div>
        </header>
        <div className="te-status-row">
          <Segmented aria-label="List status" value={value.status} onValueChange={(status) => update({ status })}
            options={LIST_STATUSES.map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))} />
          <p>{value.status === "draft" ? "Only you can view this list." : value.status === "open" ? "Clients can send requests after you save." : value.status === "closed" ? "Clients see a closed message after you save." : "The public page is hidden after you save."}</p>
        </div>
        <div className="te-workspace">
          <div className="te-edit-pane">
            <nav className="te-tabs" role="tablist" aria-label="List settings">
              {TABS.map((entry, index) => <button key={entry.id} type="button" role="tab" id={fieldId("tab", entry.id)}
                aria-controls={fieldId("panel", entry.id)} aria-selected={tab === entry.id} tabIndex={tab === entry.id ? 0 : -1}
                onClick={() => chooseTab(entry.id)} onKeyDown={(event) => onTabKey(event, index)}>
                <span>{index + 1}</span>{entry.label}
              </button>)}
            </nav>
            <section id={fieldId("panel", "basics")} role="tabpanel" aria-labelledby={fieldId("tab", "basics")} hidden={tab !== "basics"} className="te-panel">
              <div className="te-panel-heading"><h2>The first impression</h2><p>A clear title and a short introduction help clients choose.</p></div>
              <label htmlFor={fieldId("title")}>List title<input id={fieldId("title")} value={value.title} maxLength={120} placeholder="For example, Wedding decor services" onChange={(event) => update({ title: event.target.value })} /></label>
              <label htmlFor={fieldId("intro")}>Introduction<textarea id={fieldId("intro")} value={value.intro} maxLength={2000} rows={4} placeholder="Tell clients what they can choose and what happens next." onChange={(event) => update({ intro: event.target.value })} /></label>
              <label htmlFor={fieldId("organisation")}>Business branding<select id={fieldId("organisation")} value={value.organisation_id} onChange={(event) => update({ organisation_id: event.target.value })}>
                <option value="">NikoForm theme</option>{organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select></label>
              <p className="te-help">Your selected business name, logo and colours appear in the client preview.</p>
            </section>
            <section id={fieldId("panel", "services")} role="tabpanel" aria-labelledby={fieldId("tab", "services")} hidden={tab !== "services"} className="te-panel">
              <div className="te-panel-heading"><div><h2>Build your service list</h2><p>{value.items.length ? activeCount + " active of " + value.items.length + " services" : "Add what you offer. Clients will tick what they need."}</p></div>
                <Button id={fieldId("add-section")} type="button" variant="outline" disabled={value.sections.length >= 30} onClick={addSection}><Plus size={15} />Add section</Button>
              </div>
              <div className="te-layout-options" role="group" aria-label="Client layout">
                {(["list", "visual"] as const).map((layout) => <button key={layout} type="button" className="te-layout-option" aria-pressed={value.layout === layout} onClick={() => update({ layout })}>
                  <span className={"te-layout-picture te-layout-" + layout} aria-hidden="true">{[0, 1, 2, 3].map((n) => <i key={n} />)}</span>
                  <span><strong>{layout === "list" ? "List" : "Visual"}</strong><small>{layout === "list" ? "A simple, scannable tick list" : "Let your photos do the talking"}</small></span>
                  {value.layout === layout && <Check size={15} />}
                </button>)}
              </div>
              <div className="te-options">
                <label className="te-switch"><span><strong>Let clients switch view</strong><small>Offer both List and Visual on the client page.</small></span><input type="checkbox" role="switch" checked={value.allow_view_switch} onChange={(event) => update({ allow_view_switch: event.target.checked })} /></label>
                <label className="te-switch"><span><strong>Show prices</strong><small>Optional. Add prices and a running estimate.</small></span><input type="checkbox" role="switch" checked={value.show_prices} onChange={(event) => update({ show_prices: event.target.checked })} /></label>
              </div>
              {!value.items.length && <div className="te-empty">
                <span className="te-empty-icon"><Sparkles size={25} strokeWidth={1.4} /></span>
                <h3>What can your clients choose?</h3><p>Start with one service. Add a photo, a short note and a quantity if you need one.</p>
                <Button type="button" onClick={() => addItem(value.sections[0]?.id || "")}><Plus size={16} />Add your first service</Button>
              </div>}
              {groups.map((group, groupIndex) => {
                const items = value.items.filter((item) => item.section_id === group.id);
                if (!group.id && !items.length && value.sections.length) return null;
                return <section className="te-service-group" key={group.id} data-todo-move={"section:" + group.id} aria-label={group.title || "Untitled section"}>
                  <div className="te-group-heading">
                    {group.id ? <label className="te-section-title" htmlFor={fieldId("section", group.id)}><span className="sr-only">Section title</span><input id={fieldId("section", group.id)} value={group.title} maxLength={120} onChange={(event) => update({ sections: value.sections.map((section) => section.id === group.id ? { ...section, title: event.target.value } : section) })} /></label> : <h3>{group.title}</h3>}
                    <span className="te-count">{items.length}</span>
                    {group.id && <div className="te-icon-actions">
                      <Button type="button" variant="ghost" size="icon" aria-label={"Move section " + group.title + " up"} disabled={groupIndex === 0} onClick={() => reorderSection(groupIndex, -1)}><ArrowUp size={14} /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={"Move section " + group.title + " down"} disabled={groupIndex === value.sections.length - 1} onClick={() => reorderSection(groupIndex, 1)}><ArrowDown size={14} /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={"Delete section " + group.title} onClick={() => {
                        move({ sections: value.sections.filter((section) => section.id !== group.id), items: value.items.map((item) => item.section_id === group.id ? { ...item, section_id: "" } : item) });
                        focusField("add-section");
                      }}><Trash2 size={14} /></Button>
                    </div>}
                  </div>
                  <div className="te-service-rows">
                    {items.map((item, itemIndex) => {
                      const isExpanded = expanded === item.id;
                      const price = value.show_prices ? toMinorUnits(item.price) : null;
                      return <div className="te-service" data-todo-move={"item:" + item.id} data-expanded={isExpanded} key={item.id}>
                        <div className="te-service-summary">
                          <button type="button" className="te-service-open" aria-expanded={isExpanded} aria-controls={fieldId("item", item.id)} onClick={() => setExpanded(isExpanded ? null : item.id)}>
                            <span className="te-thumb">{item.image_url ? <Image src={item.image_url} alt="" width={48} height={48} unoptimized /> : <ImagePlus size={19} strokeWidth={1.5} />}</span>
                            <span className="te-service-copy"><strong>{item.name.trim() || "Untitled service"}</strong><small>{item.note || (item.per_unit ? "Quantity per " + (item.unit_label || "unit") : "Add a short note and a photo")}</small></span>
                            {price !== null && <span className="te-row-price">{formatMoney(price)}</span>}
                            {isExpanded ? <ChevronUp size={15} /> : <Pencil size={14} />}
                          </button>
                          <label className="te-active"><input type="checkbox" role="switch" checked={item.active} aria-label={"Show " + (item.name || "service") + " to clients"} onChange={(event) => patchItem(item.id, { active: event.target.checked })} /><span>{item.active ? "Shown" : "Hidden"}</span></label>
                        </div>
                        <div id={fieldId("item", item.id)} className="te-item-fields" hidden={!isExpanded}>
                          <div className="te-item-toolbar"><span>Service details</span><div className="te-icon-actions">
                            <Button type="button" size="icon" variant="ghost" disabled={itemIndex === 0} aria-label={"Move " + (item.name || "service") + " up"} onClick={() => reorderItem(item, -1)}><ArrowUp size={15} /></Button>
                            <Button type="button" size="icon" variant="ghost" disabled={itemIndex === items.length - 1} aria-label={"Move " + (item.name || "service") + " down"} onClick={() => reorderItem(item, 1)}><ArrowDown size={15} /></Button>
                            <Button type="button" size="icon" variant="ghost" aria-label={"Delete " + (item.name || "service")} onClick={() => {
                              update({ items: value.items.filter((peer) => peer.id !== item.id) }); setExpanded(null);
                              requestAnimationFrame(() => (document.getElementById(fieldId("add", group.id)) || document.getElementById(fieldId("add-section")))?.focus());
                            }}><Trash2 size={15} /></Button>
                          </div></div>
                          <label htmlFor={fieldId("name", item.id)}>Service name<input id={fieldId("name", item.id)} value={item.name} maxLength={160} placeholder="For example, Table centrepieces" onChange={(event) => patchItem(item.id, { name: event.target.value })} /></label>
                          <label htmlFor={fieldId("note", item.id)}>Short note<textarea id={fieldId("note", item.id)} rows={2} value={item.note} maxLength={500} placeholder="What is included?" onChange={(event) => patchItem(item.id, { note: event.target.value })} /></label>
                          {value.sections.length > 0 && <label htmlFor={fieldId("item-section", item.id)}>Section<select id={fieldId("item-section", item.id)} value={item.section_id} onChange={(event) => { patchItem(item.id, { section_id: event.target.value }); focusField("item-section", item.id); }}>
                            <option value="">No section</option>{value.sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                          </select></label>}
                          <div className="te-upload"><p>Photo <span>(optional)</span></p><CoverUpload value={item.image_url || null} onChange={(url) => patchItem(item.id, { image_url: url || "" })} /></div>
                          {(value.show_prices || invalidPrice === item.id) && <label htmlFor={fieldId("price", item.id)}>{value.show_prices ? "Price in KES (optional)" : "Saved price in KES (hidden from clients)"}<input id={fieldId("price", item.id)} inputMode="decimal" value={item.price} placeholder="Leave empty for no price" onChange={(event) => patchItem(item.id, { price: event.target.value })} /></label>}
                          <label className="te-switch"><span><strong>Allow a quantity</strong><small>For services sold per table, hour or item.</small></span><input type="checkbox" role="switch" checked={item.per_unit} onChange={(event) => patchItem(item.id, { per_unit: event.target.checked })} /></label>
                          {item.per_unit && <div className="te-field-pair">
                            <label htmlFor={fieldId("unit", item.id)}>Unit label<input id={fieldId("unit", item.id)} value={item.unit_label} maxLength={40} placeholder="For example, tables" onChange={(event) => patchItem(item.id, { unit_label: event.target.value })} /></label>
                            <label htmlFor={fieldId("quantity", item.id)}>Maximum quantity<input id={fieldId("quantity", item.id)} type="number" min={1} max={1000} value={item.max_quantity} onChange={(event) => patchItem(item.id, { max_quantity: Number(event.target.value) })} /></label>
                          </div>}
                        </div>
                      </div>;
                    })}
                  </div>
                  <button id={fieldId("add", group.id)} className="te-add-service" type="button" disabled={value.items.length >= 200} onClick={() => addItem(group.id)}><Plus size={16} />Add service{group.id ? " to " + (group.title || "section") : ""}</button>
                </section>;
              })}
            </section>
            <section id={fieldId("panel", "details")} role="tabpanel" aria-labelledby={fieldId("tab", "details")} hidden={tab !== "details"} className="te-panel">
              <div className="te-panel-heading"><h2>A few details, then a conversation</h2><p>Clients leave their contact details after choosing services.</p></div>
              <div className="te-contact-example"><span><Check size={15} />Full name and phone, required</span><span><Check size={15} />Email and notes, optional</span></div>
              <label className="te-switch"><span><strong>Ask for an event date</strong><small>An optional date helps you check availability.</small></span><input type="checkbox" role="switch" checked={value.ask_event_date} onChange={(event) => update({ ask_event_date: event.target.checked })} /></label>
              <p className="te-help">A request starts a conversation. It does not confirm a booking or take a payment.</p>
            </section>
            <section id={fieldId("panel", "sending")} role="tabpanel" aria-labelledby={fieldId("tab", "sending")} hidden={tab !== "sending"} className="te-panel">
              <div className="te-panel-heading"><h2>Give the next step a personal touch</h2><p>Choose the message clients see and where new request alerts arrive.</p></div>
              <label htmlFor={fieldId("thanks")}>Thank-you message<textarea id={fieldId("thanks")} rows={4} value={value.thank_you} maxLength={2000} placeholder="Thanks. We will get back to you shortly." onChange={(event) => update({ thank_you: event.target.value })} /></label>
              <label htmlFor={fieldId("emails")}>Notification email addresses<textarea id={fieldId("emails")} rows={3} value={value.notify_emails.join("\n")} placeholder="Leave empty to use your account email" onChange={(event) => update({ notify_emails: event.target.value.split("\n") })} onBlur={() => update({ notify_emails: value.notify_emails.join("\n").split(/[\s,;]+/).filter(Boolean) })} /></label>
              <p className="te-help">Up to 5 addresses. Alerts contain a link to the request, not your client&apos;s details.</p>
            </section>
          </div>
          <aside className="te-preview-pane" aria-label="Live client preview">
            <div className="te-preview-sticky">
              <div className="te-preview-toolbar"><div><span className="te-kicker">CLIENT VIEW</span><strong>Your changes, as they happen</strong></div>
                <Button type="button" variant="ghost" size="icon" aria-label="Expand client preview" onClick={(event) => openPreview(event.currentTarget, "wide")}><Maximize2 size={16} /></Button>
              </div>
              {preview()}
              <p className="te-preview-caption"><Eye size={13} />Unsaved preview. Select a service to edit it.</p>
              <div className="te-preview-tip"><Settings2 size={17} /><p>{value.show_prices ? "Prices are visible. Turn them off at any time without losing your saved amounts." : "Let clients choose first. Prices stay hidden unless you turn them on."}</p></div>
            </div>
          </aside>
        </div>
      </fieldset>
      <footer className="te-savebar">
        <p ref={error} tabIndex={-1} role={message ? "alert" : "status"} className={message ? "te-error" : ""}>
          {message || (dirty ? "Changes are not live until you save." : saved ? "Saved. Your list is up to date." : id ? "Your saved list is up to date." : "Start with a service, then add the finishing touches.")}
        </p>
        <Button type="submit" disabled={pending}><Save size={15} />{pending ? "Saving..." : id ? "Save changes" : "Create list"}</Button>
      </footer>
    </form>
    <dialog ref={previewDialog} className="te-preview-dialog" aria-labelledby={fieldId("preview-title")} onClose={() => previewTrigger.current?.focus()}>
      <header><div><span className="te-kicker">UNSAVED PREVIEW</span><h2 id={fieldId("preview-title")}>Your client page</h2></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close client preview" onClick={() => previewDialog.current?.close()}><X size={20} /></Button>
      </header>
      <div className="te-preview-dialog-controls"><Segmented aria-label="Preview size" value={previewMode} onValueChange={setPreviewMode} options={[{ value: "phone", label: "Phone" }, { value: "wide", label: "Wide" }]} /><p>Select a service to return to its editor.</p></div>
      <div className="te-dialog-canvas">{preview(previewMode === "wide")}</div>
    </dialog>
    {id && <details className="te-danger">
      <summary>List management</summary>
      <p>Lists with requests must be archived using the status control. Only empty lists can be deleted permanently.</p>
      <form action={deleteAction}>
        <input type="hidden" name="list_id" value={id} />
        <Button type="submit" variant="destructive" disabled={deleting} onClick={(event) => { if (!window.confirm("Permanently delete this empty list?")) event.preventDefault(); }}><Trash2 size={15} />Delete empty list</Button>
        {deletion.error && <p role="alert" className="te-error">{deletion.error}</p>}
      </form>
    </details>}
  </div>;
}
