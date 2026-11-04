"use client";

import { createCustomerAction, updateCustomerAction } from "@/lib/actions/billing";
import { EMPTY_CUSTOMER, type CustomerInput } from "@/lib/billing/schemas";
import { BillingInput, BillingSelect, BillingTextarea, Field, SaveBar, useBillingAction } from "./form-fields";

export type CompanyOption = { id: string; name: string };

export function CustomerFields({ initial = EMPTY_CUSTOMER, prefix = "", companies = [] }: { initial?: CustomerInput; prefix?: string; companies?: CompanyOption[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Name"><BillingInput name={`${prefix}name`} defaultValue={initial.name} required maxLength={200} autoComplete="name" /></Field>
    <Field label="Company"><BillingInput name={`${prefix}company`} defaultValue={initial.company} maxLength={200} /></Field>
    <Field label="Email"><BillingInput name={`${prefix}email`} type="email" defaultValue={initial.email} maxLength={254} autoComplete="email" /></Field>
    <Field label="Phone"><BillingInput name={`${prefix}phone`} type="tel" defaultValue={initial.phone} maxLength={80} autoComplete="tel" /></Field>
    <div className="sm:col-span-2"><Field label="Address"><BillingTextarea name={`${prefix}address`} defaultValue={initial.address} maxLength={2000} /></Field></div>
    <Field label="KRA PIN"><BillingInput name={`${prefix}kra_pin`} defaultValue={initial.kra_pin} maxLength={80} /></Field>
    {companies.length > 0 ? <Field label="Linked company" hint="Optional link to a company in your business cards."><BillingSelect name={`${prefix}organisation_id`} defaultValue={initial.organisation_id}><option value="">None</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</BillingSelect></Field> : <input type="hidden" name={`${prefix}organisation_id`} value={initial.organisation_id} />}
    <div className="sm:col-span-2"><Field label="Private customer notes"><BillingTextarea name={`${prefix}notes`} defaultValue={initial.notes} maxLength={4000} /></Field></div>
  </div>;
}

export function CustomerForm({ id, initial, companies }: { id?: string; initial?: CustomerInput; companies: CompanyOption[] }) {
  const { state, pending, onSubmit } = useBillingAction(id ? updateCustomerAction : createCustomerAction);
  return <form onSubmit={onSubmit} noValidate className="mt-6 max-w-3xl">
    {id && <input type="hidden" name="id" value={id} />}
    <fieldset disabled={pending} className="nf-panel p-5 sm:p-6"><CustomerFields initial={initial} companies={companies} /></fieldset>
    <SaveBar state={state} pending={pending} label={id ? "Save customer" : "Create customer"} cancel="/dashboard/billing/customers" />
  </form>;
}
