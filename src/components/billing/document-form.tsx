"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/qr-codes/form-section";
import { EMPTY_CUSTOMER, quantityMilli, vatRateSchema, type DocumentInput } from "@/lib/billing/schemas";
import { documentTotals, lineTotal } from "@/lib/billing/totals";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { CustomerFields } from "./customer-form";
import { TemplateSwatches } from "./template-swatches";
import { BillingInput, BillingSelect, BillingTextarea, Field, SaveBar, useBillingAction, type BillingAction } from "./form-fields";

type Item = DocumentInput["items"][number] & { key: string };
type CustomerOption = { id: string; name: string; company: string | null; archived: boolean };
const blankItem = (): Item => ({ key: crypto.randomUUID(), section: "", title: "", description: "", quantity: "1", unit_price: "" });

export function DocumentForm({ id, type, initial, customers, templates, action, sent = false }: {
  id?: string; type: "quote" | "invoice"; initial: DocumentInput; customers: CustomerOption[];
  templates: { value: string; label: string; description: string }[]; action: BillingAction; sent?: boolean;
}) {
  const { state, pending, onSubmit, open, toggle } = useBillingAction(action, { customer: true, basics: true, items: true });
  const [items, setItems] = useState<Item[]>(() => initial.items.map((i, n) => ({ ...i, key: `initial-${n}` })));
  const [removing, setRemoving] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const [mode, setMode] = useState(customers.length && initial.customer_id ? "existing" : customers.length ? "existing" : "new");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState(initial.customer_id);
  const [vatMode, setVatMode] = useState(initial.vat_mode);
  const [vatRate, setVatRate] = useState(initial.vat_rate_bp);
  const [currency, setCurrency] = useState(initial.currency);
  const [template, setTemplate] = useState(initial.template);
  const [itemNotice, setItemNotice] = useState("");
  const visibleCustomers = customers.filter((c) => c.id === customerId || `${c.name} ${c.company ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const activeItems = items.filter((i) => !removing.includes(i.key));
  const rate = vatRateSchema.safeParse(vatRate);
  let totals: ReturnType<typeof documentTotals> | null = null;
  try {
    // Blank titles do not prevent a useful live amount while typing.
    const amounts = activeItems.map((i) => ({ quantity_milli: quantityMilli(i.quantity), unit_price: toMinorUnits(i.unit_price) }));
    if (rate.success && amounts.every((i) => i.quantity_milli !== null && i.unit_price !== null)) {
      totals = documentTotals(amounts as { quantity_milli: number; unit_price: number }[], vatMode, rate.data);
    }
  } catch { /* The save action returns the specific validation error. */ }
  const safeCurrency = /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : "KES";
  const update = (key: string, field: keyof DocumentInput["items"][number], value: string) => setItems((rows) => rows.map((i) => i.key === key ? { ...i, [field]: value } : i));

  function remove(key: string) {
    if (activeItems.length <= 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRemoving((keys) => [...keys, key]);
    const index = items.findIndex((item) => item.key === key);
    const focusKey = items[index + 1]?.key ?? items[index - 1]?.key;
    timers.current.push(setTimeout(() => {
      setItems((rows) => rows.filter((i) => i.key !== key));
      setRemoving((keys) => keys.filter((k) => k !== key));
      document.getElementById(`billing-item-title-${focusKey}`)?.focus();
    }, reduce ? 0 : 160));
    setItemNotice("Item removed.");
  }

  function move(key: string, step: number) {
    setItems((rows) => {
      const next = [...rows];
      const from = next.findIndex((i) => i.key === key);
      const to = from + step;
      if (to < 0 || to >= next.length) return rows;
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setItemNotice(`Item moved ${step < 0 ? "up" : "down"}.`);
  }

  return <form onSubmit={onSubmit} noValidate className="mt-6">
    {id && <input type="hidden" name="id" value={id} />}
    <input type="hidden" name="items" value={JSON.stringify(activeItems.map((item) => ({ section: item.section, title: item.title, description: item.description, quantity: item.quantity, unit_price: item.unit_price })))} />
    <input type="hidden" name="customer_mode" value={mode} />
    {sent && <p className="qr-rise mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="note">This document has been marked sent. The customer may already have the old version.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <fieldset disabled={pending} className="min-w-0 divide-y rounded-xl border bg-card">
        <FormSection id="billing-customer" title="Customer" summary={mode === "new" ? "New customer" : customers.find((c) => c.id === customerId)?.name || "Choose a customer"} open={Boolean(open.customer)} onToggle={() => toggle("customer")}>
          <Field label="Customer option"><BillingSelect value={mode} onChange={(e) => setMode(e.target.value)}><option value="existing">Existing customer</option><option value="new">New customer</option></BillingSelect></Field>
          <div key={mode} className="qr-fade">
            {mode === "existing" ? <div className="space-y-4">
              <Field label="Search customers"><BillingInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or company" /></Field>
              <Field label="Bill to"><BillingSelect name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required><option value="">Choose a customer</option>{visibleCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` / ${c.company}` : ""}{c.archived ? " (archived)" : ""}</option>)}</BillingSelect></Field>
              {customers.length === 0 && <p className="text-sm text-muted-foreground">No customers yet. Choose New customer to add one with this document.</p>}
            </div> : <CustomerFields prefix="new_" initial={EMPTY_CUSTOMER} />}
          </div>
        </FormSection>
        <FormSection id="billing-basics" title="Document" summary={`New ${type} details`} open={Boolean(open.basics)} onToggle={() => toggle("basics")}>
          <Field label="Title" hint="Optional subtitle, such as LOGO & BRAND GUIDELINES."><BillingInput name="title" defaultValue={initial.title} maxLength={300} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue date"><BillingInput type="date" name="issue_date" defaultValue={initial.issue_date} required /></Field>
            {type === "invoice" ? <Field label="Due date"><BillingInput type="date" name="due_date" defaultValue={initial.due_date} /></Field> : <Field label="Valid until"><BillingInput type="date" name="valid_until" defaultValue={initial.valid_until} /></Field>}
            <input type="hidden" name={type === "invoice" ? "valid_until" : "due_date"} value="" />
            <Field label="Currency"><BillingInput name="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required maxLength={3} /></Field>
            <Field label="VAT"><BillingSelect name="vat_mode" value={vatMode} onChange={(e) => setVatMode(e.target.value as typeof vatMode)}><option value="none">No VAT</option><option value="exclusive">Exclusive (add VAT)</option><option value="inclusive">Inclusive (VAT included)</option></BillingSelect></Field>
            <Field label="VAT rate (%)"><BillingInput name="vat_rate_bp" inputMode="decimal" value={vatRate} onChange={(e) => setVatRate(e.target.value)} required /></Field>
          </div>
        </FormSection>
        <FormSection id="billing-items" title="Items" summary={`${activeItems.length} ${activeItems.length === 1 ? "item" : "items"}`} open={Boolean(open.items)} onToggle={() => toggle("items")}>
          <p className="sr-only" aria-live="polite">{itemNotice}</p>
          <div className="space-y-4">{items.map((item, n) => {
            const deleting = removing.includes(item.key);
            let amount: number | null = null;
            const quantity = quantityMilli(item.quantity);
            const price = toMinorUnits(item.unit_price);
            try { if (quantity !== null && price !== null) amount = lineTotal(quantity, price); } catch { /* Totals validation handles overflow. */ }
            return <div key={item.key} className={`billing-item rounded-lg border p-4 ${deleting ? "billing-item-removing" : "qr-rise"}`} inert={deleting}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Item {n + 1}</h3>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move item ${n + 1} up`} disabled={n === 0 || removing.length > 0} onClick={() => move(item.key, -1)}><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move item ${n + 1} down`} disabled={n === items.length - 1 || removing.length > 0} onClick={() => move(item.key, 1)}><ArrowDown className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${n + 1}`} disabled={activeItems.length <= 1 || deleting} onClick={() => remove(item.key)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <div className="space-y-3">
                <Field label="Section heading (optional)"><BillingInput value={item.section} onChange={(e) => update(item.key, "section", e.target.value)} maxLength={200} placeholder="e.g. BANNER DESIGN" /></Field>
                <Field label="Item title"><BillingInput id={`billing-item-title-${item.key}`} value={item.title} onChange={(e) => update(item.key, "title", e.target.value)} required={!deleting} maxLength={300} /></Field>
                <Field label="Description"><BillingTextarea value={item.description} onChange={(e) => update(item.key, "description", e.target.value)} maxLength={4000} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Quantity"><BillingInput inputMode="decimal" value={item.quantity} onChange={(e) => update(item.key, "quantity", e.target.value)} required={!deleting} /></Field>
                  <Field label={`Unit price (${safeCurrency})`}><BillingInput inputMode="decimal" value={item.unit_price} onChange={(e) => update(item.key, "unit_price", e.target.value)} required={!deleting} /></Field>
                </div>
                <p className="text-right text-sm tabular-nums">Line total: {amount === null ? "Enter quantity and price" : formatMoney(amount, safeCurrency)}</p>
              </div>
            </div>;
          })}</div>
          <Button type="button" variant="outline" disabled={items.length >= 100} onClick={() => {
            const item = blankItem();
            setItems((rows) => [...rows, item]);
            setItemNotice("New item added at the end.");
            requestAnimationFrame(() => document.getElementById(`billing-item-title-${item.key}`)?.focus());
          }}><Plus className="size-4" /> Add item</Button>
        </FormSection>
        <FormSection id="billing-details" title="Terms and design" summary={templates.find((t) => t.value === template)?.label || "Document details"} open={Boolean(open.details)} onToggle={() => toggle("details")}>
          <Field label="Payment terms"><BillingTextarea name="payment_terms" defaultValue={initial.payment_terms} maxLength={4000} /></Field>
          <Field label="Notes"><BillingTextarea name="notes" defaultValue={initial.notes} maxLength={10000} /></Field>
          <Field label="Terms"><BillingTextarea name="terms" defaultValue={initial.terms} maxLength={10000} /></Field>
          <Field label="Template"><BillingSelect name="template" value={template} onChange={(e) => setTemplate(e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</BillingSelect></Field>
          <TemplateSwatches templates={templates} value={template} onChange={setTemplate} />
          <p className="text-xs text-muted-foreground">{templates.find((t) => t.value === template)?.description}</p>
        </FormSection>
      </fieldset>
      <aside className="nf-panel p-5 lg:sticky lg:top-24" aria-label="Live totals">
        <h2 className="nf-eyebrow">Totals</h2>
        <dl className="mt-5 space-y-3 text-sm tabular-nums">
          <div className="flex justify-between gap-2"><dt>Subtotal</dt><dd>{totals ? formatMoney(totals.subtotal, safeCurrency) : "Pending"}</dd></div>
          <div className="flex justify-between gap-2"><dt>VAT</dt><dd>{totals ? formatMoney(totals.vatAmount, safeCurrency) : "Pending"}</dd></div>
          <div className="flex justify-between gap-2 border-t pt-3 font-semibold"><dt>Total</dt><dd>{totals ? formatMoney(totals.total, safeCurrency) : "Pending"}</dd></div>
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{id ? "The number stays the same when you edit." : "A document number is assigned when you save."}</p>
      </aside>
    </div>
    <SaveBar state={state} pending={pending || removing.length > 0} label={id ? "Save changes" : `Create ${type}`} cancel={id ? `/dashboard/billing/${id}` : "/dashboard/billing"}><Link href="/dashboard/billing/settings" className="text-muted-foreground underline underline-offset-4">Billing settings</Link></SaveBar>
  </form>;
}
