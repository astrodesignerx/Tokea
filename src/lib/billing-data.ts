import { prisma } from "@/lib/db";
import { PROFILE_DEFAULTS, type ProfileInput, type CustomerInput, type DocumentInput } from "@/lib/billing/schemas";
import { toMajorUnitsInput } from "@/lib/money";
import { templatesFor } from "@/lib/billing/templates";
import { billingToday } from "@/lib/billing/status";
import type { BillingProfile, Customer, BillingDocument, BillingDocumentItem } from "@/generated/prisma/client";

export function profileInput(profile: BillingProfile | null, user: { name: string | null; email: string }): ProfileInput {
  const result = { ...PROFILE_DEFAULTS, business_name: user.name || user.email };
  if (!profile) return result;
  for (const key of Object.keys(result) as (keyof ProfileInput)[]) {
    const value = profile[key];
    Object.assign(result, { [key]: typeof value === "boolean" ? value : value == null ? "" : String(value) });
  }
  result.vat_rate_bp = toMajorUnitsInput(profile.vat_rate_bp);
  return result;
}

export function customerInput(customer: Customer): CustomerInput {
  return { name: customer.name, company: customer.company ?? "", email: customer.email ?? "", phone: customer.phone ?? "", address: customer.address ?? "", kra_pin: customer.kra_pin ?? "", notes: customer.notes ?? "", organisation_id: customer.organisation_id ?? "" };
}

export async function editorData(ownerId: string, customerId?: string | null) {
  const [profile, customers] = await Promise.all([
    prisma.billingProfile.findUnique({ where: { user_id: ownerId } }),
    prisma.customer.findMany({ where: { owner_id: ownerId, OR: [{ archived_at: null }, ...(customerId ? [{ id: customerId }] : [])] }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true, archived_at: true } }),
  ]);
  return { profile, customers: customers.map((c) => ({ id: c.id, name: c.name, company: c.company, archived: Boolean(c.archived_at) })), templates: templatesFor(profile ?? {}) };
}

export function newDocumentInput(profile: BillingProfile | null): DocumentInput {
  const today = billingToday();
  const end = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  return {
    customer_id: "", title: "", issue_date: today,
    due_date: end(profile?.default_invoice_due_days ?? 7), valid_until: end(profile?.default_quote_validity_days ?? 14),
    currency: profile?.default_currency ?? "KES", vat_mode: profile?.vat_registered ? "exclusive" : "none",
    vat_rate_bp: toMajorUnitsInput(profile?.vat_rate_bp ?? 1600),
    items: [{ section: "", title: "", description: "", quantity: "1", unit_price: "" }],
    payment_terms: profile?.default_payment_terms ?? "", notes: "", terms: profile?.default_terms ?? "", template: profile?.default_template ?? "classic",
  };
}

export function documentInput(doc: BillingDocument & { items: BillingDocumentItem[] }): DocumentInput {
  return {
    customer_id: doc.customer_id ?? "", title: doc.title ?? "", issue_date: doc.issue_date.toISOString().slice(0, 10),
    due_date: doc.due_date?.toISOString().slice(0, 10) ?? "", valid_until: doc.valid_until?.toISOString().slice(0, 10) ?? "",
    currency: doc.currency, vat_mode: doc.vat_mode as DocumentInput["vat_mode"], vat_rate_bp: toMajorUnitsInput(doc.vat_rate_bp),
    items: doc.items.map((i) => ({ section: i.section ?? "", title: i.title, description: i.description ?? "", quantity: `${Math.floor(i.quantity_milli / 1000)}.${String(i.quantity_milli % 1000).padStart(3, "0")}`.replace(/\.?0+$/, ""), unit_price: toMajorUnitsInput(i.unit_price) })),
    payment_terms: doc.payment_terms ?? "", notes: doc.notes ?? "", terms: doc.terms ?? "", template: doc.template,
  };
}
