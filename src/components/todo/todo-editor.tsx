"use client";

import { useActionState, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, Plus, X } from "lucide-react";
import { autosaveTodoAction, deleteTodoListAction } from "@/lib/actions/todo";
import { editorSchema, type TodoEditorValue } from "@/lib/todo/validation";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { CoverUpload } from "@/components/event/cover-upload";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { TodoEditorPreview, type TodoOrganisation } from "./todo-editor-preview";
import "./todo-editor.css";

type Item = TodoEditorValue["items"][number];
type SaveStatus = "idle" | "saving" | "saved" | "error" | "invalid";
type SheetKind = "row" | "section" | "settings" | "preview";

const DEBOUNCE_MS = 700;
const MAX_ITEMS = 200;
const MAX_SECTIONS = 30;
const MAX_NAME = 160;
const MAX_SECTION_NAME = 120;
const PRICE_MESSAGE = "Use a positive price or zero, with at most two decimal places.";
const STATUS_LABEL = { draft: "Draft", open: "Live", closed: "Closed", archived: "Archived" } as const;

function hasContent(value: TodoEditorValue) {
  return value.title.trim().length > 0 || value.items.length > 0;
}

function applyIds(value: TodoEditorValue, map: Record<string, string>): TodoEditorValue {
  if (!Object.keys(map).length) return value;
  const to = (id: string) => map[id] ?? id;
  return {
    ...value,
    sections: value.sections.map((section) => ({ ...section, id: to(section.id) })),
    items: value.items.map((item) => ({ ...item, id: to(item.id), section_id: to(item.section_id) })),
  };
}

function Sheet({ open, onClose, label, wide = false, children }: {
  open: boolean; onClose: () => void; label: string; wide?: boolean; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);
  return <dialog ref={dialog} className={"te-sheet" + (wide ? " te-sheet-wide" : "")} aria-label={label} onClose={onClose}
    onPointerDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
    onClick={(event) => { if (pressedBackdrop.current && event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="te-sheet-body">{children}</div>
  </dialog>;
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="te-line">
    <span className="te-line-text"><span>{label}</span>{hint && <small>{hint}</small>}</span>
    <input type="checkbox" role="switch" className="te-switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

export function TodoEditor({ id, initial, organisations, businessName = "NikoForm", origin, slug: initialSlug = "" }: {
  id: string | null;
  initial: TodoEditorValue;
  organisations: TodoOrganisation[];
  businessName?: string;
  origin: string;
  slug?: string;
}) {
  const [value, setValue] = useState(initial);
  const [listId, setListId] = useState(id);
  const [slug, setSlug] = useState(initialSlug);
  const [status, setStatus] = useState<SaveStatus>(id ? "saved" : "idle");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [draft, setDraft] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [targetId, setTargetId] = useState(initial.sections.at(-1)?.id ?? "");
  const [freshId, setFreshId] = useState("");
  const [keyMap, setKeyMap] = useState<Record<string, string>>({});
  const [active, setActiveState] = useState<SheetKind | null>(null);
  const [rowId, setRowId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [previewMode, setPreviewMode] = useState("phone");
  const [confirming, setConfirming] = useState("");
  const [copied, setCopied] = useState(false);
  const [deletion, deleteAction, deleting] = useActionState(deleteTodoListAction, { error: null });

  const valueRef = useRef(value);
  const listIdRef = useRef(id);
  const rev = useRef(0);
  const savedRev = useRef(0);
  const inFlight = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const blocked = useRef(false);
  const layoutTouched = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const activeRef = useRef<SheetKind | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);
  const introRef = useRef<HTMLTextAreaElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const isNew = id === null;
  const keyOf = (itemId: string) => keyMap[itemId] ?? itemId;
  const organisation = organisations.find((org) => org.id === value.organisation_id);
  const activeCount = value.items.filter((item) => item.active).length;
  const target = value.sections.some((section) => section.id === targetId) ? targetId : (value.sections.at(-1)?.id ?? "");
  const targetSection = value.sections.find((section) => section.id === target);
  const rowItem = value.items.find((item) => item.id === rowId);
  const sectionItem = value.sections.find((section) => section.id === sectionId);
  const statusText = copied ? "Link copied"
    : status === "saving" ? "Saving..."
      : status === "saved" || (status === "idle" && listId) ? "Saved"
        : status === "idle" ? "" : "Not saved";
  const publishBlocked = value.status === "draft" && activeCount === 0;
  const publishReason = !value.items.length ? "Add a service to publish." : "Show at least one service to publish.";

  // Autosave -------------------------------------------------------------

  async function flush() {
    window.clearTimeout(timer.current);
    if (blocked.current || inFlight.current || rev.current === savedRev.current) return;
    const current = valueRef.current;
    if (!listIdRef.current && !hasContent(current)) { setStatus("idle"); return; }
    const payload: TodoEditorValue = { ...current, title: current.title.trim() ? current.title : "Untitled list" };
    const parsed = editorSchema.safeParse(payload);
    if (!parsed.success) {
      setStatus("invalid");
      setMessage(parsed.error.issues[0]?.message ?? "Check the list.");
      return;
    }
    if (payload.items.some((item) => item.price.trim() && toMinorUnits(item.price) === null)) {
      setStatus("invalid");
      setMessage(PRICE_MESSAGE);
      return;
    }
    inFlight.current = true;
    const sent = rev.current;
    setStatus("saving");
    let result: Awaited<ReturnType<typeof autosaveTodoAction>>;
    try { result = await autosaveTodoAction(listIdRef.current, JSON.stringify(payload)); }
    catch { result = { ok: false, error: "Could not reach the server." }; }
    inFlight.current = false;
    if (!result.ok) {
      if (result.conflict) { blocked.current = true; setConflict(true); setMessage("This list changed in another window."); }
      else setMessage(result.error);
      setStatus("error");
      return;
    }
    const firstSave = !listIdRef.current;
    listIdRef.current = result.id;
    // Merge into the latest state, so edits made while the request ran are kept.
    const next = { ...applyIds(valueRef.current, result.idMap), updated_at: result.updated_at };
    valueRef.current = next;
    setValue(next);
    const to = (key: string) => result.idMap[key] ?? key;
    setKeyMap((map) => {
      const merged = { ...map };
      for (const [from, dbId] of Object.entries(result.idMap)) merged[dbId] = map[from] ?? from;
      return merged;
    });
    setTargetId(to);
    setRowId(to);
    setSectionId(to);
    setFreshId(to);
    setConfirming(to);
    setListId(result.id);
    setSlug(result.slug);
    savedRev.current = sent;
    if (firstSave) window.history.replaceState(null, "", "/dashboard/todo/" + result.id);
    if (rev.current !== sent) void flushRef.current();
    else { setStatus("saved"); setMessage(""); }
  }

  useEffect(() => { flushRef.current = flush; });

  function touch() {
    rev.current += 1;
    if (blocked.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current(), DEBOUNCE_MS);
    if (!listIdRef.current && !hasContent(valueRef.current)) return;
    setStatus((now) => now === "invalid" || now === "error" ? now : "saving");
  }

  function update(change: (current: TodoEditorValue) => TodoEditorValue) {
    let next = change(valueRef.current);
    if (isNew && !layoutTouched.current) {
      const photos = next.items.filter((item) => item.image_url).length;
      next = { ...next, layout: next.items.length && photos * 2 >= next.items.length ? "visual" : "list" };
    }
    valueRef.current = next;
    setValue(next);
    touch();
  }

  function patchItem(itemId: string, patch: Partial<Item>) {
    update((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }));
  }

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flushRef.current(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.clearTimeout(timer.current);
      window.clearTimeout(copiedTimer.current);
      void flushRef.current();
    };
  }, []);

  useEffect(() => {
    if (status !== "saving" && status !== "error" && status !== "invalid") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  useLayoutEffect(() => {
    const node = introRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = node.scrollHeight + "px";
  }, [value.intro]);

  // Sheets ---------------------------------------------------------------

  function setActive(kind: SheetKind | null) {
    activeRef.current = kind;
    setActiveState(kind);
  }
  // Closing from code only flips the state. The dialog's close event then runs sheetClosed, which saves and returns focus.
  function closeSheet() { setActiveState(null); }
  function openSheet(kind: SheetKind) {
    if (!activeRef.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirming("");
    setActive(kind);
  }
  function sheetClosed(kind: SheetKind) {
    if (activeRef.current !== kind) return;
    setActive(null);
    void flush();
    const back = opener.current;
    if (back?.isConnected) back.focus(); else addRef.current?.focus();
  }
  function openRow(itemId: string) { setRowId(itemId); openSheet("row"); }
  function openSection(next: string) { setSectionId(next); openSheet("section"); }

  // Editing --------------------------------------------------------------

  function addFromBar(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLimitMessage("");
    if (text.startsWith("#")) {
      const name = text.replace(/^#+\s*/, "").trim();
      if (!name) return;
      if (value.sections.length >= MAX_SECTIONS) { setLimitMessage("A list can have up to 30 headings."); return; }
      if (name.length > MAX_SECTION_NAME) { setLimitMessage("Headings can be up to 120 characters."); return; }
      const created = "new:" + crypto.randomUUID();
      update((current) => ({ ...current, sections: [...current.sections, { id: created, title: name }] }));
      setTargetId(created);
    } else {
      if (value.items.length >= MAX_ITEMS) { setLimitMessage("A list can have up to 200 services."); return; }
      if (text.length > MAX_NAME) { setLimitMessage("Names can be up to 160 characters."); return; }
      const created = "new:" + crypto.randomUUID();
      const item: Item = { id: created, section_id: target, name: text, note: "", image_url: "", price: "", per_unit: false, unit_label: "", max_quantity: 20, active: true };
      update((current) => ({ ...current, items: [...current.items, item] }));
      setFreshId(created);
      requestAnimationFrame(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        root.current?.querySelector(`[data-row="${created}"]`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
      });
    }
    setDraft("");
    addRef.current?.focus();
  }

  function moveItem(item: Item, direction: number) {
    update((current) => {
      const items = [...current.items];
      const peers = items.filter((peer) => peer.section_id === item.section_id);
      const other = peers[peers.findIndex((peer) => peer.id === item.id) + direction];
      if (!other) return current;
      const a = items.findIndex((peer) => peer.id === item.id);
      const b = items.findIndex((peer) => peer.id === other.id);
      [items[a], items[b]] = [items[b], items[a]];
      return { ...current, items };
    });
  }

  function moveSection(section: { id: string }, direction: number) {
    update((current) => {
      const sections = [...current.sections];
      const from = sections.findIndex((s) => s.id === section.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= sections.length) return current;
      [sections[from], sections[to]] = [sections[to], sections[from]];
      return { ...current, sections };
    });
  }

  function removeItem(itemId: string) {
    update((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    setConfirming("");
    closeSheet();
  }

  function removeSection(removedId: string) {
    update((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== removedId),
      items: current.items.map((item) => item.section_id === removedId ? { ...item, section_id: "" } : item),
    }));
    closeSheet();
  }

  function setListStatus(next: TodoEditorValue["status"]) {
    update((current) => ({ ...current, status: next }));
    void flush();
  }

  async function share() {
    const url = origin + "/t/" + slug;
    try {
      if (typeof navigator.share === "function") { await navigator.share({ url, title: value.title.trim() || "Our services" }); return; }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch { /* The link is also shown under the editor. */ }
  }

  // Rendering ------------------------------------------------------------

  function priceText(item: Item) {
    if (!value.show_prices || !item.price.trim()) return "";
    const minor = toMinorUnits(item.price);
    if (minor === null) return "";
    return formatMoney(minor) + (item.per_unit ? " / " + (item.unit_label.trim() || "unit") : "");
  }

  function renderRow(item: Item) {
    const price = priceText(item);
    const itemName = item.name.trim() || "Untitled service";
    return <li key={keyOf(item.id)} className={"te-row" + (item.id === freshId ? " te-row-new" : "")} data-row={item.id}>
      <button type="button" className="te-row-button" data-off={!item.active} onClick={() => openRow(item.id)}>
        <span className="te-name">{itemName}</span>
        {item.image_url && <Image src={item.image_url} alt="" width={28} height={28} unoptimized className="te-thumb" />}
        {price && <span className="te-price">{price}</span>}
        {!item.active && <span className="te-hidden-word">Hidden</span>}
      </button>
      <button
        type="button"
        className="te-row-delete"
        aria-label={`Delete ${itemName}`}
        title={`Delete ${itemName}`}
        onClick={(event) => {
          event.stopPropagation();
          removeItem(item.id);
        }}
      >
        <X size={15} strokeWidth={2} />
      </button>
    </li>;
  }

  const ungrouped = value.items.filter((item) => !item.section_id);
  const showNotice = status === "error" || status === "invalid";
  const peers = rowItem ? value.items.filter((item) => item.section_id === rowItem.section_id) : [];
  const rowIndex = rowItem ? peers.findIndex((item) => item.id === rowItem.id) : 0;
  const sectionIndex = sectionItem ? value.sections.findIndex((section) => section.id === sectionItem.id) : 0;
  const rowPriceBad = rowItem ? Boolean(rowItem.price.trim()) && toMinorUnits(rowItem.price) === null : false;
  const canShare = value.status === "open" && Boolean(slug);

  return <div ref={root} className="todo-editor-a">
    <header className="te-top">
      <div className="te-state" role="status" aria-live="polite">
        <span className="te-dot" data-state={copied ? "saved" : status} aria-hidden="true" />
        <span>{statusText}</span>
      </div>
      <div className="te-actions">
        <span className="te-chip" data-status={value.status}>{STATUS_LABEL[value.status]}</span>
        <button type="button" className="te-icon-button" aria-label="Preview client page" onClick={() => openSheet("preview")}><Eye size={18} /></button>
        {value.status === "draft"
          ? <Button type="button" className="te-primary" disabled={publishBlocked} aria-describedby={publishBlocked ? "te-publish-reason" : undefined}
            onClick={() => { update((current) => ({ ...current, status: "open" })); void flush(); }}>Publish</Button>
          : value.status === "open"
            ? <Button type="button" className="te-primary" disabled={!canShare} onClick={() => void share()}>Share</Button>
            : null}
      </div>
    </header>
    {publishBlocked && <p id="te-publish-reason" className="te-hint">{publishReason}</p>}
    {showNotice && <div className="te-notice" role={status === "error" ? "alert" : "status"}>
      <p>{message}</p>
      {conflict
        ? <button type="button" className="te-text-button" onClick={() => location.reload()}>Reload</button>
        : status === "error" && <button type="button" className="te-text-button" onClick={() => void flush()}>Retry</button>}
    </div>}

    <input className="te-title" aria-label="List title" placeholder="Name your list" maxLength={120} value={value.title}
      onChange={(event) => { const title = event.target.value; update((current) => ({ ...current, title })); }} />
    <textarea ref={introRef} className="te-intro" aria-label="Intro" rows={1} maxLength={2000} placeholder="Add a short intro (optional)" value={value.intro}
      onChange={(event) => { const intro = event.target.value; update((current) => ({ ...current, intro })); }} />

    {value.items.length === 0 && <p className="te-empty">Add your first service below.</p>}
    {(value.items.length > 0 || value.sections.length > 0) && <ul className="te-card">
      {ungrouped.map(renderRow)}
      {value.sections.map((section) => [
        <li key={"s-" + keyOf(section.id)} className="te-section-row">
          <button type="button" className="te-section" aria-label={"Heading " + section.title} onClick={() => openSection(section.id)}>{section.title}</button>
        </li>,
        ...value.items.filter((item) => item.section_id === section.id).map(renderRow),
      ])}
    </ul>}

    <div className="te-dock">
      <form className="te-add" onSubmit={addFromBar}>
        <input ref={addRef} aria-label="Add a service" placeholder={targetSection ? "Add to " + targetSection.title : "Add a service"}
          autoComplete="off" enterKeyHint="done" value={draft} onChange={(event) => { setDraft(event.target.value); setLimitMessage(""); }} />
        <button type="submit" className="te-plus" aria-label="Add"><Plus size={20} strokeWidth={2.4} /></button>
      </form>
      {limitMessage && <p className="te-limit" role="status">{limitMessage}</p>}
      <div className="te-under">
        <span>Type # for a heading</span>
        <button type="button" className="te-text-button" onClick={() => openSheet("settings")}>Settings</button>
      </div>
    </div>

    <Sheet open={active === "row"} onClose={() => sheetClosed("row")} label="Edit service">
      {rowItem && <>
        <div className="te-sheet-head"><h2>Edit service</h2><Button type="button" className="te-done" onClick={closeSheet}>Done</Button></div>
        <div className="te-field">
          <span className="te-label">Photo (optional)</span>
          <CoverUpload value={rowItem.image_url || null} onChange={(url) => patchItem(rowItem.id, { image_url: url ?? "" })} />
        </div>
        <label className="te-field"><span className="te-label">Name</span>
          <input value={rowItem.name} maxLength={MAX_NAME} onChange={(event) => patchItem(rowItem.id, { name: event.target.value })} /></label>
        <label className="te-field"><span className="te-label">Note (optional)</span>
          <textarea rows={2} maxLength={500} value={rowItem.note} onChange={(event) => patchItem(rowItem.id, { note: event.target.value })} /></label>
        {value.show_prices && <>
          <label className="te-field"><span className="te-label">Price (optional)</span>
            <input inputMode="decimal" maxLength={40} value={rowItem.price} aria-invalid={rowPriceBad} onChange={(event) => patchItem(rowItem.id, { price: event.target.value })} />
            {rowPriceBad && <span className="te-error">{PRICE_MESSAGE}</span>}</label>
          <Switch label="Charge per unit" checked={rowItem.per_unit} onChange={(per_unit) => patchItem(rowItem.id, { per_unit })} />
          {rowItem.per_unit && <div className="te-pair">
            <label className="te-field"><span className="te-label">Unit label</span>
              <input maxLength={40} placeholder="hour" value={rowItem.unit_label} onChange={(event) => patchItem(rowItem.id, { unit_label: event.target.value })} /></label>
            <label className="te-field"><span className="te-label">Max quantity</span>
              <input type="number" inputMode="numeric" min={1} max={1000} value={rowItem.max_quantity}
                onChange={(event) => {
                  const next = Math.trunc(Number(event.target.value));
                  patchItem(rowItem.id, { max_quantity: Number.isFinite(next) ? Math.min(1000, Math.max(1, next)) : 1 });
                }} /></label>
          </div>}
        </>}
        {value.sections.length > 0 && <label className="te-field"><span className="te-label">Section</span>
          <select value={rowItem.section_id} onChange={(event) => patchItem(rowItem.id, { section_id: event.target.value })}>
            <option value="">No section</option>
            {value.sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
          </select></label>}
        <Switch label="Show to clients" checked={rowItem.active} onChange={(on) => patchItem(rowItem.id, { active: on })} />
        <div className="te-pair">
          <Button type="button" variant="outline" className="te-wide" disabled={rowIndex <= 0} onClick={() => moveItem(rowItem, -1)}><ArrowUp size={16} />Move up</Button>
          <Button type="button" variant="outline" className="te-wide" disabled={rowIndex >= peers.length - 1} onClick={() => moveItem(rowItem, 1)}><ArrowDown size={16} />Move down</Button>
        </div>
        {confirming === rowItem.id
          ? <div className="te-confirm" role="group" aria-label="Confirm delete">
            <p>Delete {rowItem.name.trim() || "this service"}?</p>
            <div className="te-pair">
              <Button type="button" variant="outline" className="te-wide" onClick={() => setConfirming("")}>Keep</Button>
              <Button type="button" variant="destructive" className="te-wide" onClick={() => removeItem(rowItem.id)}>Delete</Button>
            </div>
          </div>
          : <button type="button" className="te-danger" onClick={() => setConfirming(rowItem.id)}>Delete</button>}
      </>}
    </Sheet>

    <Sheet open={active === "section"} onClose={() => sheetClosed("section")} label="Edit heading">
      {sectionItem && <>
        <div className="te-sheet-head"><h2>Edit heading</h2><Button type="button" className="te-done" onClick={closeSheet}>Done</Button></div>
        <label className="te-field"><span className="te-label">Name</span>
          <input value={sectionItem.title} maxLength={MAX_SECTION_NAME}
            onChange={(event) => { const title = event.target.value; update((current) => ({ ...current, sections: current.sections.map((s) => s.id === sectionItem.id ? { ...s, title } : s) })); }} /></label>
        <Button type="button" variant="outline" className="te-wide" onClick={() => { setTargetId(sectionItem.id); closeSheet(); }}>Add new services here</Button>
        <div className="te-pair">
          <Button type="button" variant="outline" className="te-wide" disabled={sectionIndex <= 0} onClick={() => moveSection(sectionItem, -1)}><ArrowUp size={16} />Move up</Button>
          <Button type="button" variant="outline" className="te-wide" disabled={sectionIndex >= value.sections.length - 1} onClick={() => moveSection(sectionItem, 1)}><ArrowDown size={16} />Move down</Button>
        </div>
        <button type="button" className="te-danger" onClick={() => removeSection(sectionItem.id)}>Delete heading (services move to no heading)</button>
      </>}
    </Sheet>

    <Sheet open={active === "settings"} onClose={() => sheetClosed("settings")} label="Settings">
      <div className="te-sheet-head"><h2>Settings</h2><Button type="button" className="te-done" onClick={closeSheet}>Done</Button></div>
      <div className="te-field">
        <span className="te-label" id="te-look">Look</span>
        <Segmented aria-labelledby="te-look" value={value.layout} className="te-segmented"
          onValueChange={(layout) => { layoutTouched.current = true; update((current) => ({ ...current, layout })); }}
          options={[{ value: "list", label: "List" }, { value: "visual", label: "Photos" }]} />
      </div>
      <Switch label="Show prices" hint="Adds a price field and a running estimate" checked={value.show_prices}
        onChange={(show_prices) => update((current) => ({ ...current, show_prices }))} />
      <Switch label="Ask for event date" checked={value.ask_event_date}
        onChange={(ask_event_date) => update((current) => ({ ...current, ask_event_date }))} />
      {organisations.length > 0 && <label className="te-field"><span className="te-label">Business branding</span>
        <select value={value.organisation_id} onChange={(event) => { const organisation_id = event.target.value; update((current) => ({ ...current, organisation_id })); }}>
          <option value="">{businessName}</option>
          {organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select></label>}
      <label className="te-field"><span className="te-label">Email me new requests (one address per line)</span>
        <textarea rows={3} autoComplete="off" value={value.notify_emails.join("\n")}
          onChange={(event) => { const notify_emails = event.target.value.split("\n"); update((current) => ({ ...current, notify_emails })); }} /></label>
      <label className="te-field"><span className="te-label">Thank-you message</span>
        <textarea rows={3} maxLength={2000} value={value.thank_you}
          onChange={(event) => { const thank_you = event.target.value; update((current) => ({ ...current, thank_you })); }} /></label>
      <div className="te-actions-list">
        {(value.status === "open" || value.status === "closed") && <Button type="button" variant="outline" className="te-wide"
          onClick={() => setListStatus(value.status === "open" ? "closed" : "open")}>{value.status === "open" ? "Close to new requests" : "Reopen"}</Button>}
        <Button type="button" variant="outline" className="te-wide"
          onClick={() => setListStatus(value.status === "archived" ? "draft" : "archived")}>{value.status === "archived" ? "Unarchive" : "Archive"}</Button>
        {listId && (confirming === "list"
          ? <form action={deleteAction} className="te-confirm">
            <input type="hidden" name="list_id" value={listId} />
            <p>Delete this list?</p>
            <div className="te-pair">
              <Button type="button" variant="outline" className="te-wide" onClick={() => setConfirming("")}>Keep</Button>
              <Button type="submit" variant="destructive" className="te-wide" disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
            </div>
            {deletion.error && <p className="te-error" role="alert">{deletion.error}</p>}
          </form>
          : <button type="button" className="te-danger" onClick={() => setConfirming("list")}>Delete list</button>)}
      </div>
    </Sheet>

    <Sheet open={active === "preview"} onClose={() => sheetClosed("preview")} label="Client preview" wide={previewMode === "wide"}>
      <div className="te-sheet-head">
        <h2>Client preview</h2>
        <button type="button" className="te-icon-button" aria-label="Close preview" onClick={closeSheet}><X size={18} /></button>
      </div>
      <div className="te-preview-controls">
        <Segmented aria-label="Preview size" value={previewMode} onValueChange={setPreviewMode} options={[{ value: "phone", label: "Phone" }, { value: "wide", label: "Wide" }]} />
        <p>Select a service to edit it.</p>
      </div>
      <TodoEditorPreview value={value} organisation={organisation} wide={previewMode === "wide"} onEdit={openRow} />
    </Sheet>
  </div>;
}
