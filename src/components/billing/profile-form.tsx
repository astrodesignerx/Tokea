"use client";

import { useState } from "react";
import { saveBillingProfileAction } from "@/lib/actions/billing";
import type { ProfileInput } from "@/lib/billing/schemas";
import { FormSection } from "@/components/qr-codes/form-section";
import { BillingInput, BillingSelect, BillingTextarea, Field, SaveBar, useBillingAction } from "./form-fields";
import { TemplateSwatches } from "./template-swatches";

type Template = { value: string; label: string; description: string };
export function ProfileForm({ initial, templates }: { initial: ProfileInput; templates: Template[] }) {
  const { state, pending, onSubmit, open, toggle } = useBillingAction(saveBillingProfileAction, { business: true });
  const [template, setTemplate] = useState(initial.default_template);
  const input = (key: keyof ProfileInput, label: string, type = "text", hint?: string) => <Field key={key} label={label} hint={hint}><BillingInput name={key} type={type} defaultValue={String(initial[key])} required={key === "business_name"} /></Field>;
  const area = (key: keyof ProfileInput, label: string) => <Field key={key} label={label}><BillingTextarea name={key} defaultValue={String(initial[key])} /></Field>;
  const section = (id: string, title: string, summary: string, body: React.ReactNode) => <FormSection key={id} id={`billing-${id}`} title={title} summary={summary} open={Boolean(open[id])} onToggle={() => toggle(id)}>{body}</FormSection>;
  return <form onSubmit={onSubmit} noValidate className="mt-6 max-w-3xl">
    <fieldset disabled={pending} className="divide-y overflow-hidden rounded-xl border bg-card">
      {section("business", "Business", initial.business_name, <>{input("business_name", "Business name")}{area("footer_text", "Footer text")}</>)}
      {section("brand", "Brand", `${initial.font} / ${initial.brand_primary}`, <>
        {input("logo_url", "Logo URL", "text", "Use an https image address or a path starting with /.")}
        <div className="grid gap-4 sm:grid-cols-2">{input("brand_primary", "Primary colour", "color")}{input("brand_accent", "Accent colour", "color")}</div>
        <Field label="Font"><BillingSelect name="font" defaultValue={initial.font}><option value="poppins">Poppins</option><option value="inter">Inter</option><option value="serif">Serif</option></BillingSelect></Field>
      </>)}
      {section("contact", "Contact", initial.email || "Email, phone and address", <div className="grid gap-4 sm:grid-cols-2">{input("phone", "Phone", "tel")}{input("email", "Email", "email")}{input("website", "Website", "url")}{input("social_handle", "Social handle")}<div className="sm:col-span-2">{area("address", "Address")}</div></div>)}
      {section("bank", "Bank", initial.bank_name || "Optional bank details", <div className="grid gap-4 sm:grid-cols-2">{input("bank_name", "Bank name")}{input("bank_account_name", "Account name")}{input("bank_account_number", "Account number")}{input("bank_branch", "Branch")}</div>)}
      {section("mpesa", "M-Pesa", initial.mpesa_type || "Optional M-Pesa details", <>
        <Field label="M-Pesa type"><BillingSelect name="mpesa_type" defaultValue={initial.mpesa_type}><option value="">None</option><option value="paybill">Paybill</option><option value="till">Till</option><option value="phone">Phone</option></BillingSelect></Field>
        <div className="grid gap-4 sm:grid-cols-2">{input("mpesa_number", "Number")}{input("mpesa_account", "Account")}{input("mpesa_name", "Name")}</div>
      </>)}
      {section("tax", "Tax", initial.vat_registered ? `VAT ${initial.vat_rate_bp}%` : "VAT not registered", <>
        <Field label="VAT registered"><input type="checkbox" name="vat_registered" defaultChecked={initial.vat_registered} className="size-5 accent-primary" /></Field>
        {input("vat_rate_bp", "VAT rate (%)", "text")}{input("kra_pin", "KRA PIN")}
        <Field label="Enable eTIMS" hint="Sending invoices to KRA is coming later. Turning this on now only stores your setting."><input type="checkbox" role="switch" name="etims_enabled" defaultChecked={initial.etims_enabled} className="size-5 accent-primary" /></Field>
      </>)}
      {section("numbering", "Numbering", "Next numbers can only go up", <>
        <p className="text-sm text-muted-foreground">Numbers are allocated on save and never reused. Changing a prefix does not reset its counter.</p>
        {(["invoice", "quote", "receipt"] as const).map((type) => <div key={type} className="grid gap-4 sm:grid-cols-2">{input(`${type}_prefix`, `${type.charAt(0).toUpperCase() + type.slice(1)} prefix`)}<Field label={`Next ${type} number`}><BillingInput name={`next_${type}_number`} type="number" min={Number(initial[`next_${type}_number`])} max={2147483646} step="1" defaultValue={initial[`next_${type}_number`]} required /></Field></div>)}
      </>)}
      {section("defaults", "Defaults", `${initial.default_currency} / ${initial.default_template}`, <>
        <div className="grid gap-4 sm:grid-cols-2">{input("default_currency", "Currency")}{input("default_quote_validity_days", "Quote validity (days)", "number")}{input("default_invoice_due_days", "Invoice due (days)", "number")}</div>
        {area("default_payment_terms", "Payment terms")}{area("default_terms", "Terms")}
        <Field label="Default template"><BillingSelect name="default_template" value={template} onChange={(e) => setTemplate(e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</BillingSelect></Field>
        <TemplateSwatches templates={templates} value={template} onChange={setTemplate} />
        <ul className="space-y-1 text-xs text-muted-foreground">{templates.map((t) => <li key={t.value}>{t.label}: {t.description}</li>)}</ul>
      </>)}
    </fieldset>
    <SaveBar state={state} pending={pending} label="Save billing settings" cancel="/dashboard/billing" />
  </form>;
}
