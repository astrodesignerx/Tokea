import type { BillingDocument, BillingDocumentItem, BillingProfile } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/money";
import { loadBillingLogo } from "./logo";

export type PdfItem = { title: string; description: string | null; quantity: string; unitPrice: string; lineTotal: string };
export type PdfSection = { title: string | null; items: PdfItem[] };
export type PdfDocument = {
  type: "quote" | "invoice" | "receipt";
  template: string;
  privateTemplate: string | null;
  number: string;
  title: string | null;
  business: { name: string; logo: string | null; address: string | null; phone: string | null; email: string | null; website: string | null; socialHandle: string | null; footerText: string | null };
  billTo: { name: string; company: string | null; address: string | null; phone: string | null; email: string | null };
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  validityDays: number | null;
  paidDate: string | null;
  invoice: { number: string; issueDate: string; status: "Paid in full" | "Part paid" } | null;
  currency: string;
  vatMode: string;
  vatRate: string;
  sections: PdfSection[];
  subtotal: string;
  vat: string;
  total: string;
  amountPaid: string;
  balance: string;
  paymentTerms: string | null;
  notes: string | null;
  terms: string | null;
  bank: { label: string; value: string }[] | null;
  mpesa: { label: string; value: string }[] | null;
  brand: { primary: string; accent: string; fontFamily: "Poppins" | "Inter" | "Young Serif" };
};

type DocumentRows = BillingDocument & {
  items: BillingDocumentItem[];
  invoice?: Pick<BillingDocument, "number" | "issue_date" | "total" | "amount_paid"> | null;
};

export function pdfDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Nairobi", month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function resolvePdfTemplate(template: string, privateTemplate: string | null): string {
  if (["classic", "minimal", "bold"].includes(template)) return template;
  return template === "astro" && privateTemplate === "astro" ? "astro" : "classic";
}

function block(rows: [string, string | null | undefined][]): { label: string; value: string }[] | null {
  const values = rows.filter((row): row is [string, string] => Boolean(row[1]?.trim())).map(([label, value]) => ({ label, value }));
  return values.length ? values : null;
}

export async function buildPdfDocument(doc: DocumentRows, profile: BillingProfile | null, fallbackName = "Business"): Promise<PdfDocument> {
  const money = (amount: number) => formatMoney(amount, doc.currency).replace(/\u00a0/g, " ");
  const sections: PdfSection[] = [];
  for (const item of [...doc.items].sort((a, b) => a.position - b.position)) {
    const title = item.section?.trim() || null;
    if (!sections.length || sections[sections.length - 1].title !== title) sections.push({ title, items: [] });
    sections[sections.length - 1].items.push({
      title: item.title, description: item.description,
      quantity: String(item.quantity_milli / 1000), unitPrice: money(item.unit_price), lineTotal: money(item.line_total),
    });
  }
  const isReceipt = doc.type === "receipt";
  const invoice = isReceipt ? doc.invoice : null;
  const colour = (value: string | undefined, fallback: string) => value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
  return {
    type: isReceipt ? "receipt" : doc.type === "quote" ? "quote" : "invoice",
    template: resolvePdfTemplate(doc.template, profile?.private_template ?? null),
    privateTemplate: profile?.private_template ?? null,
    number: doc.number, title: doc.title,
    business: {
      name: profile?.business_name || fallbackName, logo: await loadBillingLogo(profile?.logo_url),
      address: profile?.address ?? null, phone: profile?.phone ?? null, email: profile?.email ?? null,
      website: profile?.website ?? null, socialHandle: profile?.social_handle ?? null, footerText: profile?.footer_text ?? null,
    },
    billTo: { name: doc.bill_to_name, company: doc.bill_to_company, address: doc.bill_to_address, phone: doc.bill_to_phone, email: doc.bill_to_email },
    issueDate: pdfDate(doc.issue_date), dueDate: doc.due_date ? pdfDate(doc.due_date) : null,
    validUntil: doc.valid_until ? pdfDate(doc.valid_until) : null,
    validityDays: doc.valid_until ? Math.max(0, Math.round((doc.valid_until.getTime() - doc.issue_date.getTime()) / 86_400_000)) : null,
    paidDate: isReceipt ? pdfDate(doc.paid_at ?? doc.issue_date) : doc.paid_at ? pdfDate(doc.paid_at) : null,
    invoice: invoice ? { number: invoice.number, issueDate: pdfDate(invoice.issue_date), status: invoice.amount_paid >= invoice.total ? "Paid in full" : "Part paid" } : null,
    currency: doc.currency, vatMode: doc.vat_mode, vatRate: `${doc.vat_rate_bp / 100}%`, sections,
    subtotal: money(doc.subtotal), vat: money(doc.vat_amount), total: money(doc.total), amountPaid: money(doc.amount_paid),
    balance: money(Math.max(0, invoice ? invoice.total - invoice.amount_paid : doc.total - doc.amount_paid)),
    paymentTerms: doc.payment_terms, notes: doc.notes, terms: doc.terms,
    bank: block([["Bank", profile?.bank_name], ["Name", profile?.bank_account_name], ["Acc. No.", profile?.bank_account_number], ["Branch", profile?.bank_branch],
      ["Currency", profile?.bank_name || profile?.bank_account_number ? doc.currency : null]]),
    mpesa: block([[profile?.mpesa_type === "paybill" ? "Paybill" : profile?.mpesa_type === "till" ? "Till" : "Phone", profile?.mpesa_number], ["Account", profile?.mpesa_account], ["Name", profile?.mpesa_name]]),
    brand: { primary: colour(profile?.brand_primary, "#111111"), accent: colour(profile?.brand_accent, "#f7ad19"), fontFamily: profile?.font === "inter" ? "Inter" : profile?.font === "serif" ? "Young Serif" : "Poppins" },
  };
}
