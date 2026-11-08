"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Check, Grid2X2, List, Minus, Plus } from "lucide-react";
import { submitTodoAction } from "@/lib/actions/todo-submit";
import { calculateEstimate, clampQuantity } from "@/lib/todo/logic";
import { formatMoney } from "@/lib/money";

type Item = {
  id: string; section_id: string | null; name: string; note: string | null; image_url: string | null;
  price: number | null; per_unit: boolean; unit_label: string | null; max_quantity: number;
};
type Props = {
  slug: string; title: string; intro: string | null; business: string; logo: string | null;
  brand?: { primary: string; ink: string }; layout: "list" | "visual"; allowViewSwitch: boolean;
  showPrices: boolean; currency: string; askEventDate: boolean; preview: boolean;
  sections: { id: string; title: string }[]; items: Item[];
};

export function PublicTodo(props: Props) {
  const [view, setView] = useState(props.layout);
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [details, setDetails] = useState({ name: "", phone: "", email: "", event_date: "", notes: "" });
  const [state, action, pending] = useActionState(submitTodoAction.bind(null, props.slug), { error: null });
  const heading = useRef<HTMLHeadingElement>(null);
  const pickHeading = useRef<HTMLHeadingElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!props.allowViewSwitch) return;
    try {
      const saved = localStorage.getItem(`todo-view:${props.slug}`);
      if (saved === "list" || saved === "visual") {
        // Apply after hydration, without exposing browser storage to server rendering.
        const frame = requestAnimationFrame(() => setView(saved));
        return () => cancelAnimationFrame(frame);
      }
    } catch { /* Storage can be disabled in private browsers. */ }
  }, [props.slug, props.allowViewSwitch]);
  useEffect(() => { if (state.error) error.current?.focus(); }, [state]);
  const selected = props.items.filter((item) => picked[item.id]);
  let estimate: number | null = null;
  let tooLarge = false;
  try { estimate = calculateEstimate(selected.map((i) => ({ price: i.price, quantity: picked[i.id] })), props.showPrices); }
  catch { tooLarge = true; }
  const groups = [
    { id: "ungrouped", title: "", items: props.items.filter((i) => !i.section_id) },
    ...props.sections.map((section) => ({ ...section, items: props.items.filter((i) => i.section_id === section.id) })),
  ].filter((group) => group.items.length);
  function toggle(item: Item) {
    setPicked((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id]; else next[item.id] = 1;
      return next;
    });
  }
  function chooseView(next: "list" | "visual") {
    setView(next);
    try { localStorage.setItem(`todo-view:${props.slug}`, next); } catch { /* Keep the current choice in memory. */ }
  }
  function changeStep(next: "pick" | "details") {
    setStep(next);
    requestAnimationFrame(() => (next === "details" ? heading : pickHeading).current?.focus());
  }
  function price(item: Item) {
    return props.showPrices && item.price !== null ? <span className="todo-price">{formatMoney(item.price, props.currency)}{item.per_unit ? ` / ${item.unit_label || "unit"}` : ""}</span> : null;
  }
  function quantity(item: Item) {
    if (!item.per_unit || !picked[item.id]) return null;
    return <div className="todo-quantity todo-rise">
      <span className="text-xs text-muted-foreground">{item.unit_label || "Quantity"}</span>
      <div className="todo-stepper" role="group" aria-label={`Quantity for ${item.name}`}>
        <button type="button" aria-label={`Fewer ${item.name}`} disabled={picked[item.id] <= 1} onClick={() => setPicked((p) => ({ ...p, [item.id]: clampQuantity(p[item.id] - 1, true, item.max_quantity) }))}><Minus size={14} /></button>
        <output aria-live="polite">{picked[item.id]}</output>
        <button type="button" aria-label={`More ${item.name}`} disabled={picked[item.id] >= item.max_quantity} onClick={() => setPicked((p) => ({ ...p, [item.id]: clampQuantity(p[item.id] + 1, true, item.max_quantity) }))}><Plus size={14} /></button>
      </div>
    </div>;
  }
  const style = props.brand ? { "--todo-primary": props.brand.primary, "--todo-on-primary": props.brand.ink } as CSSProperties : undefined;
  return <div className="todo-surface min-h-dvh" style={style}>
    {props.preview && <p className="border-b bg-muted px-4 py-3 text-center text-sm font-medium">Preview, not live. Requests cannot be sent.</p>}
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-5">
        {props.logo ? <Image src={props.logo} alt="" width={44} height={44} unoptimized className="size-11 rounded-xl bg-muted object-contain p-1" /> : <span className="todo-logo" aria-hidden="true">{props.business.charAt(0)}</span>}
        <div className="min-w-0 flex-1"><p className="font-semibold">{props.business}</p><p className="text-xs text-muted-foreground">Choose your services</p></div>
        {props.allowViewSwitch && step === "pick" && <div className="todo-view" role="group" aria-label="View">
          <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => chooseView("list")}><List size={18} /></button>
          <button type="button" aria-label="Visual view" aria-pressed={view === "visual"} onClick={() => chooseView("visual")}><Grid2X2 size={18} /></button>
        </div>}
      </div>
    </header>
    <main className="todo-main relative mx-auto max-w-2xl px-5 pb-36 pt-6">
      <div className="todo-flow" data-active={step === "pick"} aria-hidden={step !== "pick"} inert={step !== "pick"}>
        <h1 ref={pickHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{props.intro || "Tick everything you need. We will confirm availability."}</p>
        {!props.items.length && <p className="mt-8 text-muted-foreground">Services will appear here when they are added.</p>}
        <div className="relative mt-6">
          {(["list", "visual"] as const).map((layout) => <div key={layout} className="todo-view-panel" data-active={view === layout} aria-hidden={view !== layout} inert={view !== layout}>
            {groups.map((group) => <section key={group.id} className="mt-7 first:mt-0" aria-label={group.title || undefined}>
              {group.title && <h2 className="mb-3 text-xs font-semibold text-muted-foreground">{group.title}</h2>}
              <div className={layout === "visual" ? "todo-grid" : ""}>
                {group.items.map((item) => <div key={item.id} className={layout === "visual" ? "todo-card" : "todo-row"} data-selected={!!picked[item.id]}>
                  <button type="button" className={layout === "visual" ? "todo-visual-pick" : "todo-list-pick"} data-photo={layout === "visual" ? !!item.image_url : undefined} aria-pressed={!!picked[item.id]} onClick={() => toggle(item)}>
                    {layout === "visual" && item.image_url && <Image src={item.image_url} alt="" width={480} height={360} unoptimized className="todo-photo" />}
                    <span className={layout === "visual" && item.image_url ? "todo-check todo-badge" : "todo-check"} aria-hidden="true"><Check size={15} /></span>
                    <span className="todo-item-copy"><span className="block font-medium">{item.name}</span>{item.note && <span className={"mt-1 block text-xs leading-relaxed text-muted-foreground" + (layout === "list" ? " line-clamp-2" : "")}>{item.note}</span>}{layout === "visual" && !item.image_url && price(item)}</span>
                    {!(layout === "visual" && !item.image_url) && price(item)}
                  </button>
                  {quantity(item)}
                </div>)}
              </div>
            </section>)}
          </div>)}
        </div>
      </div>
      <div className="todo-flow" data-active={step === "details"} aria-hidden={step !== "details"} inert={step !== "details"}>
        <button type="button" className="todo-back" onClick={() => changeStep("pick")}>Back to services</button>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold">Your details</h1>
        <p className="mt-2 text-sm text-muted-foreground">We will reply with availability{props.showPrices ? " and a quote" : ""}.</p>
        <div className="mt-5 rounded-xl border bg-card px-4">
          {selected.map((i) => <div key={i.id} className="flex justify-between gap-3 border-b py-3 text-sm last:border-0"><span>{i.name}{i.per_unit ? ` x ${picked[i.id]}` : ""}</span>{props.showPrices && i.price !== null && <span className="todo-price">{formatMoney(i.price * picked[i.id], props.currency)}</span>}</div>)}
          {props.showPrices && estimate !== null && <div className="flex justify-between gap-3 border-t py-3 text-sm font-semibold"><span>Estimate</span><span>{formatMoney(estimate, props.currency)}</span></div>}
        </div>
        {props.showPrices && <p className="mt-2 text-xs text-muted-foreground">Final price is confirmed in your quote. Services without prices are excluded from the estimate.</p>}
        <form action={action} className="todo-details mt-5" aria-busy={pending}>
          <input type="hidden" name="items" value={JSON.stringify(selected.map((i) => ({ id: i.id, quantity: picked[i.id] })))} />
          <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label>Full name<input name="name" autoComplete="name" required maxLength={160} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /></label>
          <label>Phone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={60} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></label>
          <label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={200} value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} /></label>
          {props.askEventDate && <label>Event date (optional)<input name="event_date" type="date" value={details.event_date} onChange={(e) => setDetails({ ...details, event_date: e.target.value })} /></label>}
          <label>Notes (optional)<textarea name="notes" maxLength={1000} rows={4} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} /></label>
          {state.error && <p ref={error} tabIndex={-1} role="alert" className="mt-4 text-sm text-destructive">{state.error}</p>}
          <button type="submit" className="todo-cta mt-6 w-full" disabled={pending || !selected.length || props.preview || tooLarge}>{pending ? "Sending..." : props.preview ? "Preview only" : "Send request"}</button>
        </form>
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">Made with NikoForm</p>
    </main>
    <div className="todo-bottom" data-visible={selected.length > 0 && step === "pick"} inert={!selected.length || step !== "pick"} aria-hidden={!selected.length || step !== "pick"}>
      <div className="min-w-0 flex-1" aria-live="polite"><strong className="block text-sm">{props.showPrices && estimate !== null ? formatMoney(estimate, props.currency) : `${selected.length} selected`}</strong><span className="text-xs text-white/65">{tooLarge ? "Please choose fewer services" : props.showPrices ? `${selected.length} selected, estimate` : "Ready when you are"}</span></div>
      <button type="button" className="todo-cta" disabled={!selected.length || tooLarge} onClick={() => changeStep("details")}>Continue</button>
    </div>
  </div>;
}
