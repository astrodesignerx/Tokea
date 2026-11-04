"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { customerSchema, documentSchema, profileSchema } from "@/lib/billing/schemas";
import { documentTotals, lineTotal, MAX_AMOUNT } from "@/lib/billing/totals";
import { formatDocNumber } from "@/lib/billing/numbering";
import { billingToday, canEditDocument, canTransition } from "@/lib/billing/status";
import { templatesFor } from "@/lib/billing/templates";

export type BillingFormState = { error: string | null; section?: string; errorAt?: number; savedAt?: number };
type Tx = Prisma.TransactionClient;
type Owner = { id: string; name: string | null; email: string };
const ROOT = "/dashboard/billing";
const TX_OPTIONS = { maxWait: 10000, timeout: 20000 };

class BillingError extends Error {
  constructor(message: string, readonly section = "basics") { super(message); }
}

function failed(error: unknown): BillingFormState {
  if (error instanceof BillingError) return { error: error.message, section: error.section, errorAt: Date.now() };
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return { error: "That document number is already in use. Raise the next number in billing settings and try again.", section: "basics", errorAt: Date.now() };
  }
  throw error;
}

const PROFILE_SECTIONS: Record<string, string> = {
  business_name: "business", footer_text: "business", logo_url: "brand", brand_primary: "brand", brand_accent: "brand", font: "brand",
  phone: "contact", email: "contact", website: "contact", social_handle: "contact", address: "contact",
  vat_registered: "tax", vat_rate_bp: "tax", kra_pin: "tax", etims_enabled: "tax",
};

function validationError(error: z.ZodError, profile = false): BillingFormState {
  const issue = error.issues[0];
  const key = String(issue.path[0] ?? "basics");
  const section = profile ? (PROFILE_SECTIONS[key] ?? (key.startsWith("bank_") ? "bank" : key.startsWith("mpesa_") ? "mpesa" : key.startsWith("default_") ? "defaults" : "numbering"))
    : key === "items" ? "items" : ["terms", "notes", "payment_terms", "template"].includes(key) ? "details" : key === "new_customer" || key === "customer_id" ? "customer" : "basics";
  const item = key === "items" && typeof issue.path[1] === "number" ? `Item ${issue.path[1] + 1}: ` : "";
  return { error: `${item}${issue.message}`, section, errorAt: Date.now() };
}

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function idFrom(form: FormData) { return value(form, "id").slice(0, 100); }
function refresh(id?: string) {
  revalidatePath(ROOT, "layout");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`${ROOT}/${id}`);
}

// Serialises profile creation, settings and counters for this owner only.
async function lockOwner(tx: Tx, ownerId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId} FOR UPDATE`;
}

async function profileFor(tx: Tx, owner: Owner) {
  return tx.billingProfile.upsert({
    where: { user_id: owner.id }, update: {},
    create: { user_id: owner.id, business_name: (owner.name || owner.email).slice(0, 200) },
  });
}

async function lockedDocument(tx: Tx, ownerId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM "BillingDocument" WHERE id = ${id} AND owner_id = ${ownerId} FOR UPDATE`;
  const doc = await tx.billingDocument.findFirst({ where: { id, owner_id: ownerId }, include: { items: { orderBy: { position: "asc" } } } });
  if (!doc) throw new BillingError("This document is unavailable.");
  return doc;
}

async function allocateNumber(tx: Tx, owner: Owner, type: "quote" | "invoice") {
  await profileFor(tx, owner);
  const counter = type === "quote" ? "next_quote_number" : "next_invoice_number";
  const profile = await tx.billingProfile.update({
    where: { user_id: owner.id }, data: { [counter]: { increment: 1 } },
  });
  const n = profile[counter] - 1;
  if (n >= MAX_AMOUNT - 1) throw new BillingError("The document counter has reached its limit.", "numbering");
  return { profile, number: formatDocNumber(type === "quote" ? profile.quote_prefix : profile.invoice_prefix, n) };
}

function checkTemplate(template: string, profile: { private_template: string | null }, section = "details") {
  if (!templatesFor(profile).some((t) => t.value === template)) throw new BillingError("Choose one of your available templates.", section);
}

async function checkOrganisation(tx: Tx, ownerId: string, organisationId: string | null) {
  if (organisationId && !await tx.organisation.findFirst({ where: { id: organisationId, owner_id: ownerId }, select: { id: true } })) {
    throw new BillingError("Choose one of your own companies.", "customer");
  }
}

function billTo(customer: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null; kra_pin: string | null }) {
  return { bill_to_name: customer.name, bill_to_company: customer.company, bill_to_email: customer.email, bill_to_phone: customer.phone, bill_to_address: customer.address, bill_to_kra_pin: customer.kra_pin };
}

function copiedBillTo(doc: Awaited<ReturnType<typeof lockedDocument>>) {
  return { bill_to_name: doc.bill_to_name, bill_to_company: doc.bill_to_company, bill_to_email: doc.bill_to_email, bill_to_phone: doc.bill_to_phone, bill_to_address: doc.bill_to_address, bill_to_kra_pin: doc.bill_to_kra_pin };
}

function itemWrites(items: readonly { section: string | null; title: string; description: string | null; quantity_milli: number; unit_price: number }[]) {
  return items.map((item, position) => ({
    section: item.section, title: item.title, description: item.description, quantity_milli: item.quantity_milli,
    unit_price: item.unit_price, line_total: lineTotal(item.quantity_milli, item.unit_price), position,
  }));
}

function readDocument(form: FormData) {
  let items: unknown;
  try { items = JSON.parse(value(form, "items")); } catch { items = null; }
  return documentSchema.safeParse({
    ...Object.fromEntries(form), items,
    new_customer: value(form, "customer_mode") === "new" ? Object.fromEntries(Object.keys(customerSchema.shape).map((key) => [key, value(form, `new_${key}`)])) : undefined,
    customer_id: value(form, "customer_mode") === "new" ? "" : value(form, "customer_id"),
  });
}

async function documentFields(tx: Tx, owner: Owner, parsed: z.output<typeof documentSchema>, type: "quote" | "invoice", existing?: Awaited<ReturnType<typeof lockedDocument>>) {
  const profile = await profileFor(tx, owner);
  checkTemplate(parsed.template, profile);
  let customer;
  if (parsed.new_customer) {
    await checkOrganisation(tx, owner.id, parsed.new_customer.organisation_id);
    customer = await tx.customer.create({ data: { ...parsed.new_customer, owner_id: owner.id } });
  } else {
    customer = await tx.customer.findFirst({ where: { id: parsed.customer_id, owner_id: owner.id } });
    // An archived customer may stay on its existing document, but not a new one.
    if (!customer || (customer.archived_at && existing?.customer_id !== customer.id)) throw new BillingError("Choose an active customer.", "customer");
  }
  const items = parsed.items.map((item) => ({ ...item, quantity_milli: item.quantity }));
  const totals = documentTotals(items, parsed.vat_mode, parsed.vat_rate_bp);
  return {
    customer_id: customer.id,
    ...(existing?.status === "sent" && existing.customer_id === customer.id ? copiedBillTo(existing) : billTo(customer)),
    title: parsed.title, issue_date: new Date(`${parsed.issue_date}T00:00:00Z`),
    due_date: type === "invoice" && parsed.due_date ? new Date(`${parsed.due_date}T00:00:00Z`) : null,
    valid_until: type === "quote" && parsed.valid_until ? new Date(`${parsed.valid_until}T00:00:00Z`) : null,
    currency: parsed.currency, vat_mode: parsed.vat_mode, vat_rate_bp: parsed.vat_rate_bp,
    subtotal: totals.subtotal, vat_amount: totals.vatAmount, total: totals.total,
    payment_terms: parsed.payment_terms, notes: parsed.notes, terms: parsed.terms, template: parsed.template,
    items: { create: itemWrites(items) },
  };
}

export async function saveBillingProfileAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ ...Object.fromEntries(form), vat_registered: form.get("vat_registered") === "on", etims_enabled: form.get("etims_enabled") === "on" });
  if (!parsed.success) return validationError(parsed.error, true);
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const old = await profileFor(tx, user);
      checkTemplate(parsed.data.default_template, old, "defaults");
      for (const key of ["next_invoice_number", "next_quote_number", "next_receipt_number"] as const) {
        if (parsed.data[key] < old[key]) throw new BillingError("Next numbers can only go up. Reload settings to see the latest counters.", "numbering");
      }
      await tx.billingProfile.update({ where: { user_id: user.id }, data: parsed.data });
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  return { error: null, savedAt: Date.now() };
}

export async function createCustomerAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      await checkOrganisation(tx, user.id, parsed.data.organisation_id);
      return (await tx.customer.create({ data: { ...parsed.data, owner_id: user.id } })).id;
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  redirect(`${ROOT}/customers/${id}`);
}

export async function updateCustomerAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      await checkOrganisation(tx, user.id, parsed.data.organisation_id);
      const result = await tx.customer.updateMany({ where: { id: idFrom(form), owner_id: user.id }, data: parsed.data });
      if (!result.count) throw new BillingError("This customer is unavailable.", "customer");
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  return { error: null, savedAt: Date.now() };
}

export async function archiveCustomerAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const result = await tx.customer.updateMany({ where: { id: idFrom(form), owner_id: user.id }, data: { archived_at: value(form, "restore") === "yes" ? null : new Date() } });
      if (!result.count) throw new BillingError("This customer is unavailable.");
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  return { error: null, savedAt: Date.now() };
}

export async function createDocumentAction(type: string, _prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  if (type !== "quote" && type !== "invoice") return failed(new BillingError("Choose a quote or an invoice."));
  const parsed = readDocument(form);
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const fields = await documentFields(tx, user, parsed.data, type);
      const { number } = await allocateNumber(tx, user, type);
      return (await tx.billingDocument.create({ data: { ...fields, owner_id: user.id, type, number, status: "draft", share_token: randomBytes(32).toString("base64url") } })).id;
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  redirect(`${ROOT}/${id}`);
}

export async function updateDocumentAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  const parsed = readDocument(form);
  if (!parsed.success) return validationError(parsed.error);
  const id = idFrom(form);
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const doc = await lockedDocument(tx, user.id, id);
      if (!canEditDocument(doc)) throw new BillingError("This document is read-only now.");
      const fields = await documentFields(tx, user, parsed.data, doc.type as "quote" | "invoice", doc);
      await tx.billingDocumentItem.deleteMany({ where: { document_id: id, document: { owner_id: user.id } } });
      await tx.billingDocument.update({ where: { id, owner_id: user.id }, data: fields });
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh(id);
  redirect(`${ROOT}/${id}`);
}

export async function setDocumentStatusAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  const id = idFrom(form);
  const status = value(form, "status");
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const doc = await lockedDocument(tx, user.id, id);
      if (!canTransition(doc.type, doc.status, status)) throw new BillingError("That status change is not allowed. Reload to see the latest status.");
      await tx.billingDocument.update({ where: { id, owner_id: user.id }, data: {
        status, ...(status === "sent" ? { sent_at: new Date() } : status === "accepted" ? { accepted_at: new Date() } : status === "declined" ? { declined_at: new Date() } : { voided_at: new Date() }),
      } });
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh(id);
  return { error: null, savedAt: Date.now() };
}

async function copyDocument(tx: Tx, user: Owner, doc: Awaited<ReturnType<typeof lockedDocument>>, convert: boolean) {
  const type = convert ? "invoice" : doc.type as "quote" | "invoice";
  const { profile, number } = await allocateNumber(tx, user, type);
  const issueDate = new Date(billingToday() + "T00:00:00Z");
  const endDate = new Date(issueDate);
  endDate.setUTCDate(endDate.getUTCDate() + (type === "invoice" ? profile.default_invoice_due_days : profile.default_quote_validity_days));
  const totals = documentTotals(doc.items, doc.vat_mode as "none" | "exclusive" | "inclusive", doc.vat_rate_bp);
  return tx.billingDocument.create({ data: {
    owner_id: user.id, customer_id: doc.customer_id, ...copiedBillTo(doc), type, number, status: "draft", title: doc.title,
    issue_date: issueDate, due_date: type === "invoice" ? endDate : null, valid_until: type === "quote" ? endDate : null,
    currency: doc.currency, vat_mode: doc.vat_mode, vat_rate_bp: doc.vat_rate_bp, subtotal: totals.subtotal, vat_amount: totals.vatAmount, total: totals.total,
    payment_terms: doc.payment_terms, notes: doc.notes, terms: doc.terms, template: doc.template,
    source_quote_id: convert ? doc.id : null, share_token: randomBytes(32).toString("base64url"), items: { create: itemWrites(doc.items) },
  } });
}

export async function convertQuoteToInvoiceAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const doc = await lockedDocument(tx, user.id, idFrom(form));
      if (doc.type !== "quote" || doc.status !== "accepted") throw new BillingError("Only accepted quotes can become invoices.");
      const existing = await tx.billingDocument.findFirst({ where: { source_quote_id: doc.id, owner_id: user.id } });
      if (existing) return existing.id;
      return (await copyDocument(tx, user, doc, true)).id;
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  redirect(`${ROOT}/${id}`);
}

export async function duplicateDocumentAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const doc = await lockedDocument(tx, user.id, idFrom(form));
      if (doc.type !== "quote" && doc.type !== "invoice") throw new BillingError("Receipts cannot be duplicated.");
      return (await copyDocument(tx, user, doc, false)).id;
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  redirect(`${ROOT}/${id}/edit`);
}

export async function deleteDraftDocumentAction(_prev: BillingFormState, form: FormData): Promise<BillingFormState> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      await lockOwner(tx, user.id);
      const doc = await lockedDocument(tx, user.id, idFrom(form));
      if (doc.status !== "draft" || !["quote", "invoice"].includes(doc.type)) throw new BillingError("Only drafts can be deleted.");
      await tx.billingDocument.delete({ where: { id: doc.id, owner_id: user.id } });
    }, TX_OPTIONS);
  } catch (error) { return failed(error); }
  refresh();
  redirect(ROOT);
}
