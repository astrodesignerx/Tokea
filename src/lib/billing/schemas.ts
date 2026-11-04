import { z } from "zod";
import { toMinorUnits } from "@/lib/money";
import { documentTotals, MAX_AMOUNT, VAT_MODES } from "./totals";

const optionalText = (max = 200) => z.string().trim().max(max).transform((v) => v || null);
const email = z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address.").transform((v) => v || null);
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, such as KES.");
const wholeNumber = (min: number, max: number) => z.string().regex(/^\d+$/, "Enter a whole number.").transform(Number).pipe(z.number().int().min(min).max(max));
const colour = z.string().regex(/^#[\da-fA-F]{6}$/, "Enter a six-digit hex colour.");
const prefix = z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9 /_-]+$/, "Use letters, digits, spaces, /, _ or - in a prefix.");
export const vatRateSchema = z.string().transform((value, ctx) => {
  const rate = toMinorUnits(value);
  if (rate === null || rate > 10_000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a VAT percentage from 0 to 100, with at most two decimal places." });
    return z.NEVER;
  }
  return rate;
});

export const profileSchema = z.object({
  business_name: z.string().trim().min(1, "Enter your business name.").max(200),
  logo_url: z.string().trim().max(2000).refine((v) => !v || /^\/(?!\/)/.test(v) || (() => {
    try { return new URL(v).protocol === "https:"; } catch { return false; }
  })(), "Use an https logo URL or a path starting with /.").transform((v) => v || null),
  brand_primary: colour, brand_accent: colour, font: z.enum(["poppins", "inter", "serif"]),
  footer_text: optionalText(2000), phone: optionalText(80), email,
  website: z.string().trim().max(2000).refine((v) => !v || (() => {
    try { return ["https:", "http:"].includes(new URL(v).protocol); } catch { return false; }
  })(), "Enter a full http or https website address.").transform((v) => v || null),
  social_handle: optionalText(), address: optionalText(2000),
  bank_name: optionalText(), bank_account_name: optionalText(), bank_account_number: optionalText(100), bank_branch: optionalText(),
  mpesa_type: z.enum(["", "paybill", "till", "phone"]).transform((v) => v || null),
  mpesa_number: optionalText(80), mpesa_account: optionalText(), mpesa_name: optionalText(),
  vat_registered: z.boolean(), vat_rate_bp: vatRateSchema, kra_pin: optionalText(80), etims_enabled: z.boolean(),
  default_currency: currency, default_payment_terms: optionalText(4000), default_terms: optionalText(10000),
  default_quote_validity_days: wholeNumber(0, 3650), default_invoice_due_days: wholeNumber(0, 3650),
  default_template: z.string().trim().min(1).max(200),
  invoice_prefix: prefix, quote_prefix: prefix, receipt_prefix: prefix,
  next_invoice_number: wholeNumber(1, MAX_AMOUNT - 1), next_quote_number: wholeNumber(1, MAX_AMOUNT - 1), next_receipt_number: wholeNumber(1, MAX_AMOUNT - 1),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(200),
  company: optionalText(), email, phone: optionalText(80), address: optionalText(2000),
  kra_pin: optionalText(80), notes: optionalText(4000), organisation_id: optionalText(100),
});

export function quantityMilli(value: string): number | null {
  if (!/^\d+(\.\d{1,3})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const quantity = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_AMOUNT ? quantity : null;
}

export const itemSchema = z.object({
  section: optionalText(), title: z.string().trim().min(1, "Give every item a title.").max(300), description: optionalText(4000),
  quantity: z.string().transform((v, ctx) => {
    const quantity = quantityMilli(v);
    if (quantity === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use a positive quantity with at most three decimal places." }); return z.NEVER; }
    return quantity;
  }),
  unit_price: z.string().transform((v, ctx) => {
    const amount = toMinorUnits(v);
    if (amount === null) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a price with at most two decimal places." }); return z.NEVER; }
    return amount;
  }),
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.").refine((v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return v >= "0001-01-01" && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Choose a valid date.");

export const documentSchema = z.object({
  customer_id: z.string().max(100),
  new_customer: customerSchema.optional(),
  title: optionalText(300), issue_date: date,
  due_date: z.union([z.literal(""), date]), valid_until: z.union([z.literal(""), date]),
  currency, vat_mode: z.enum(VAT_MODES), vat_rate_bp: vatRateSchema,
  items: z.array(itemSchema).min(1, "Add at least one item.").max(100, "Use at most 100 items."),
  payment_terms: optionalText(4000), notes: optionalText(10000), terms: optionalText(10000), template: z.string().trim().min(1).max(200),
}).superRefine((data, ctx) => {
  if (!data.customer_id && !data.new_customer) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customer_id"], message: "Choose a customer or add a new one." });
  for (const key of ["due_date", "valid_until"] as const) {
    if (data[key] && data[key] < data.issue_date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "This date cannot be before the issue date." });
  }
  try {
    documentTotals(data.items.map((i) => ({ quantity_milli: i.quantity, unit_price: i.unit_price })), data.vat_mode, data.vat_rate_bp);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "The document exceeds the supported amount. Reduce the quantities or prices." });
  }
});

export type ProfileInput = z.input<typeof profileSchema>;
export type CustomerInput = z.input<typeof customerSchema>;
export type DocumentInput = z.input<typeof documentSchema>;

export const EMPTY_CUSTOMER: CustomerInput = { name: "", company: "", email: "", phone: "", address: "", kra_pin: "", notes: "", organisation_id: "" };
export const PROFILE_DEFAULTS: ProfileInput = {
  business_name: "", logo_url: "", brand_primary: "#111111", brand_accent: "#f7ad19", font: "poppins", footer_text: "",
  phone: "", email: "", website: "", social_handle: "", address: "", bank_name: "", bank_account_name: "", bank_account_number: "", bank_branch: "",
  mpesa_type: "", mpesa_number: "", mpesa_account: "", mpesa_name: "", vat_registered: false, vat_rate_bp: "16", kra_pin: "", etims_enabled: false,
  default_currency: "KES", default_payment_terms: "", default_terms: "", default_quote_validity_days: "14", default_invoice_due_days: "7", default_template: "classic",
  invoice_prefix: "INV-", quote_prefix: "QUO-", receipt_prefix: "RCT-", next_invoice_number: "1", next_quote_number: "1", next_receipt_number: "1",
};
