import assert from "node:assert/strict";
import { documentTotals, lineTotal } from "../src/lib/billing/totals";
import { formatDocNumber } from "../src/lib/billing/numbering";
import { canTransition, displayStatus } from "../src/lib/billing/status";
import { documentSchema, itemSchema, profileSchema, PROFILE_DEFAULTS, quantityMilli } from "../src/lib/billing/schemas";
import { templatesFor } from "../src/lib/billing/templates";

assert.equal(lineTotal(3000, 350000), 1050000);
assert.equal(lineTotal(1500, 99999), 149999);
assert.equal(lineTotal(500, 1), 1);
assert.equal(lineTotal(499, 1), 0);
assert.deepEqual(documentTotals([{ quantity_milli: 1000, unit_price: 800000 }], "exclusive", 1600), { subtotal: 800000, vatAmount: 128000, total: 928000 });
assert.deepEqual(documentTotals([{ quantity_milli: 1000, unit_price: 1160000 }], "inclusive", 1600), { subtotal: 1000000, vatAmount: 160000, total: 1160000 });
assert.deepEqual(documentTotals([{ quantity_milli: 1000, unit_price: 15 }], "none", 1600), { subtotal: 15, vatAmount: 0, total: 15 });
assert.throws(() => lineTotal(2147483647, 2147483647), RangeError);
assert.throws(() => documentTotals([{ quantity_milli: 1000, unit_price: 2147483647 }], "exclusive", 1600), RangeError);
assert.throws(() => lineTotal(-1, 100), RangeError);
assert.equal(formatDocNumber("INV-", 120), "INV-0120");
assert.equal(formatDocNumber("QUO-", 10001), "QUO-10001");
const invoice = { type: "invoice", status: "sent", due_date: "2026-11-03", total: 1000, amount_paid: 0 };
assert.equal(displayStatus(invoice, "2026-11-04"), "overdue");
assert.equal(displayStatus(invoice, "2026-11-03"), "sent");
assert.equal(displayStatus({ ...invoice, amount_paid: 1000, status: "paid" }, "2026-11-04"), "paid");
assert.equal(displayStatus({ ...invoice, status: "void" }, "2026-11-04"), "void");
assert.equal(displayStatus({ ...invoice, status: "draft" }, "2026-11-04"), "draft");
assert.equal(displayStatus({ ...invoice, type: "quote", valid_until: "2026-11-03" }, "2026-11-04"), "expired");
assert.equal(displayStatus({ ...invoice, type: "quote", status: "accepted", valid_until: "2026-11-03" }, "2026-11-04"), "accepted");
assert.equal(canTransition("quote", "sent", "accepted"), true);
assert.equal(canTransition("invoice", "sent", "paid"), false);
assert.equal(canTransition("invoice", "draft", "void"), false);
assert.equal(canTransition("receipt", "issued", "void"), false);
for (const type of ["quote", "invoice", "receipt"]) {
  for (const from of ["draft", "sent", "accepted", "declined", "paid", "part_paid", "void", "issued"]) {
    assert.equal(canTransition(type, from, "paid"), false);
    assert.equal(canTransition(type, from, "part_paid"), false);
    assert.equal(canTransition(type, from, "draft"), false);
  }
}
assert.equal(quantityMilli("1.001"), 1001);
assert.equal(quantityMilli("1.0001"), null);
assert.equal(itemSchema.safeParse({ section: "", title: "Design", description: "", quantity: "1", unit_price: "1.001" }).success, false);
assert.equal(documentSchema.safeParse({ customer_id: "x", title: "", issue_date: "2026-02-30", due_date: "", valid_until: "", currency: "KES", vat_mode: "none", vat_rate_bp: "16", items: [], payment_terms: "", notes: "", terms: "", template: "classic" }).success, false);
const profile = profileSchema.parse({ ...PROFILE_DEFAULTS, business_name: "Test business", private_template: "injected", next_invoice_number: "120" });
assert.equal(profile.next_invoice_number, 120);
assert.equal("private_template" in profile, false);
assert.equal(profileSchema.safeParse({ ...PROFILE_DEFAULTS, business_name: "Test", next_quote_number: "0" }).success, false);
assert.equal(templatesFor({ private_template: "studio" }).at(-1)?.label, "Your design");
console.log("Billing checks passed: integer rounding, VAT, limits, numbering, dates, statuses and validation.");
