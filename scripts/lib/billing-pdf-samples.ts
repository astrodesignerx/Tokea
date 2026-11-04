import type { BillingDocument, BillingDocumentItem, BillingProfile } from "../../src/generated/prisma/client";
import { buildPdfDocument } from "../../src/lib/billing/pdf/model";
import { documentTotals, lineTotal } from "../../src/lib/billing/totals";

export const PDF_TEMPLATES = ["classic", "minimal", "bold", "astro"] as const;
export const PDF_SCENARIOS = ["quote", "invoice", "receipt", "invoice-long"] as const;
const date = new Date("2026-10-30T00:00:00Z");

export function sampleProfile(): BillingProfile {
  return {
    id: "sample-profile", user_id: "sample-owner", business_name: "Astro Designer", logo_url: "/brand/energy4impact.png",
    brand_primary: "#173c48", brand_accent: "#b66b10", font: "poppins", footer_text: "Thank you for your business.",
    phone: "+254 757 001 242", email: "studio@example.com", website: "https://example.com", social_handle: "@astrodesignerx",
    address: "Nairobi, Kenya", bank_name: "NCBA BANK KENYA PLC", bank_account_name: "ASTRO DESIGNER", bank_account_number: "1002051064", bank_branch: "Nairobi",
    mpesa_type: "paybill", mpesa_number: "123456", mpesa_account: "ASTRO", mpesa_name: "Astro Designer",
    vat_registered: true, vat_rate_bp: 1600, kra_pin: null, etims_enabled: false, default_currency: "KES",
    default_payment_terms: "50% deposit before work begins.", default_terms: "Includes two revision rounds. Additional work is quoted separately.",
    default_quote_validity_days: 14, default_invoice_due_days: 7, default_template: "classic", private_template: "astro",
    invoice_prefix: "INV-", quote_prefix: "QUO-", receipt_prefix: "RCT-", next_invoice_number: 1, next_quote_number: 1, next_receipt_number: 1,
    letterhead_upload_id: null, letterhead_box_x: null, letterhead_box_y: null, letterhead_box_w: null, letterhead_box_h: null, created_at: date, updated_at: date,
  };
}

export function sampleRows(scenario: typeof PDF_SCENARIOS[number], template: string) {
  const long = scenario === "invoice-long";
  const type = scenario === "quote" ? "quote" : scenario === "receipt" ? "receipt" : "invoice";
  const items: BillingDocumentItem[] = Array.from({ length: long ? 25 : 4 }, (_, index) => ({
    id: `sample-item-${index}`, document_id: "sample-document", position: index, section: long ? "DESIGN SERVICES" : index < 2 ? "DESIGN" : "PRINTING",
    title: long ? `Design deliverable ${index + 1}` : ["Roll-up banner design", "Brand guidelines", "Banner printing", "Print preparation"][index],
    description: index === 0 ? "Three roll-up banner designs built from the creative brief and brand guidelines: layout, image selection and treatment, typography, logo placement and print-ready files saved to the printer's specifications. Includes a review of spacing, colour consistency, accessibility and the final production files for both digital and print use."
      : long ? "Layout, production artwork and final delivery. Includes a review and editable files for your team." : "Includes production artwork and editable source files.",
    quantity_milli: index === 1 ? 1500 : 3000, unit_price: [350000, 200000, 750000, 100000][index % 4],
    line_total: lineTotal(index === 1 ? 1500 : 3000, [350000, 200000, 750000, 100000][index % 4]),
    etims_item_code: null, etims_tax_type: null, created_at: date, updated_at: date,
  }));
  const vatMode = type === "quote" ? "none" : "exclusive";
  const totals = documentTotals(items, vatMode, 1600);
  const total = totals.total;
  const doc: BillingDocument = {
    id: "sample-document", owner_id: "sample-owner", customer_id: null,
    bill_to_name: "Akinyi Odongo Art Centre", bill_to_company: null, bill_to_email: "client@example.com", bill_to_phone: "+254 734 841 997", bill_to_address: "Nairobi, Kenya", bill_to_kra_pin: null,
    type, number: type === "quote" ? "QUO-0001" : type === "receipt" ? "RCT-0001" : "INV-0001", status: type === "receipt" ? "issued" : "sent",
    title: "Logo & brand guidelines", issue_date: date, due_date: type === "invoice" ? new Date("2026-11-06T00:00:00Z") : null,
    valid_until: type === "quote" ? new Date("2026-11-13T00:00:00Z") : null,
    currency: "KES", vat_mode: vatMode, vat_rate_bp: 1600, subtotal: totals.subtotal, vat_amount: totals.vatAmount, total,
    amount_paid: type === "quote" ? 0 : Math.round(total / 2),
    payment_terms: "50% deposit required before work commences. Balance is due on delivery.",
    notes: "Please include the document number as your payment reference.", terms: "Includes two revision rounds per project. Additional revisions and changes in scope will be quoted separately. Editable source files are transferred on receipt of full payment.",
    template, share_token: "sample-only", sent_at: null, accepted_at: null, declined_at: null, paid_at: type === "receipt" ? date : null, voided_at: null,
    source_quote_id: null, invoice_id: type === "receipt" ? "sample-invoice" : null, created_at: date, updated_at: date,
  };
  return { ...doc, items, invoice: type === "receipt" ? { number: "INV-0001", issue_date: new Date("2026-10-23T00:00:00Z"), total, amount_paid: Math.round(total / 2) } : null };
}

export async function sampleModel(scenario: typeof PDF_SCENARIOS[number], template: string) {
  const profile = sampleProfile();
  // Exercise the business-name fallback in every invoice template.
  if (scenario === "invoice") profile.logo_url = null;
  if (template === "minimal") profile.font = "inter";
  return buildPdfDocument(sampleRows(scenario, template), profile);
}
