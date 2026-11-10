import assert from "node:assert/strict";
import { calculateEstimate, clampQuantity, normalisePhone, tallyRequestItems, validEventDate } from "../src/lib/todo/logic";
import { allowTodoSubmission } from "../src/lib/todo/throttle";
import { editorSchema, submissionSchema } from "../src/lib/todo/validation";
import { slugify, withCollisionSuffix } from "../src/lib/slug";

assert.equal(calculateEstimate([{ price: 12550, quantity: 3 }, { price: null, quantity: 9 }], true), 37650);
assert.equal(calculateEstimate([{ price: 12550, quantity: 3 }], false), null);
assert.equal(calculateEstimate([], true), null);
assert.equal(calculateEstimate([], false), null);
assert.equal(calculateEstimate([{ price: null, quantity: 3 }], true), 0);
assert.equal(calculateEstimate([{ price: 0, quantity: 2 }], true), 0);
assert.throws(() => calculateEstimate([{ price: 1_000_000_000, quantity: 3 }], true));
assert.equal(clampQuantity(100, true, 20), 20);
assert.equal(clampQuantity(-10, true, 20), 1);
assert.equal(clampQuantity(4.9, true, 20), 4);
assert.equal(clampQuantity(100, false, 20), 1);
assert.equal(clampQuantity(NaN, true, 20), 1);
assert.equal(normalisePhone("0712 345 678"), "+254712345678");
assert.equal(normalisePhone("0112 345 678"), "+254112345678");
assert.equal(normalisePhone("020 123 4567"), "+254201234567");
assert.equal(normalisePhone("+254 (712) 345-678"), "+254712345678");
assert.equal(normalisePhone("0044 7700 900123"), "+447700900123");
assert.equal(normalisePhone("+1 (415) 555-2671"), "+14155552671");
for (const bad of ["123", "abc0712345678", "++254712345678", "", "+00000000"]) assert.equal(normalisePhone(bad), null);
assert.equal(validEventDate("2026-02-30"), false);
assert.equal(validEventDate("2028-02-29"), true);
assert.equal(slugify("Wedding & Decor Services"), "wedding-decor-services");
assert.match(withCollisionSuffix(slugify("Wedding & Decor Services")), /^wedding-decor-services-[a-z0-9]{4}$/);
for (let i = 0; i < 10; i++) assert.equal(allowTodoSubmission("test", "ip", 100), true);
assert.equal(allowTodoSubmission("test", "ip", 101), false);
assert.equal(allowTodoSubmission("another", "ip", 101), true);
assert.equal(allowTodoSubmission("test", "another-ip", 101), true);
assert.equal(allowTodoSubmission("test", "ip", 600100), true);
assert.equal(editorSchema.safeParse({}).success, false);
const draft = { title: "Services", intro: "", organisation_id: "", status: "draft", layout: "list", allow_view_switch: false, show_prices: false, ask_event_date: true, notify_emails: [""], thank_you: "", updated_at: "", sections: [], items: [] };
const validDraft = editorSchema.parse(draft);
assert.deepEqual(validDraft.notify_emails, []);
assert.deepEqual(editorSchema.parse({ ...draft, notify_emails: ["ONE@example.com, two@example.com", "one@example.com"] }).notify_emails, ["one@example.com", "two@example.com"]);
assert.equal(editorSchema.safeParse({ ...draft, status: "open" }).success, false);
assert.equal(editorSchema.safeParse({ ...draft, sections: [{ id: "same", title: "One" }, { id: "same", title: "Two" }] }).success, false);
const submission = { name: "Client", phone: "0712 345 678", email: "", event_date: "", notes: "", items: [{ id: "service-1", quantity: 2 }] };
assert.equal(submissionSchema.safeParse(submission).success, true);
const withNotes = submissionSchema.parse({ ...submission, notes: "  We also need a brand guide.  " });
assert.equal(withNotes.notes, "We also need a brand guide.");
assert.equal(withNotes.phone, "+254712345678");
assert.deepEqual(withNotes.items, submission.items);
assert.equal(submissionSchema.safeParse({ ...submission, items: [], notes: "A brand guide, please." }).success, true);
for (const notes of ["", " \n\t "]) {
  assert.equal(submissionSchema.safeParse({ ...submission, items: [], notes }).success, false);
}
assert.equal(submissionSchema.safeParse({ ...submission, notes: "x".repeat(1000) }).success, true);
assert.equal(submissionSchema.safeParse({ ...submission, notes: "x".repeat(1001) }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, items: [...submission.items, ...submission.items] }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, phone: "123" }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, name: " " }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, email: "not-an-email" }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, event_date: "2026-02-30" }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, items: [{ id: "service-1", quantity: Infinity }] }).success, false);
assert.equal(submissionSchema.safeParse({ ...submission, items: Array.from({ length: 201 }, (_, index) => ({ id: `service-${index}`, quantity: 1 })) }).success, false);
const picked = (request_id: string, item_id: string | null, name: string, quantity = 1, currentName?: string) => ({ request_id, item_id, name, quantity, item: currentName === undefined ? null : { name: currentName } });
assert.deepEqual(tallyRequestItems([]), []);
assert.deepEqual(tallyRequestItems([
  picked("r1", "chairs", "Old name", 4, "Chairs"),
  picked("r2", "chairs", "Earlier name", 1, "Chairs"),
  picked("r1", "chairs", "Old name", 2, "Chairs"),
  picked("r1", null, "Archived service", 1),
  picked("r2", null, "Archived service", 1),
  picked("r1", "other", "Chairs", 1, "Chairs"),
  picked("r1", null, "Chairs", 1),
]), [
  { key: "name:Archived service", name: "Archived service", requests: 2, quantity: 2, hasQuantity: false },
  { key: "item:chairs", name: "Chairs", requests: 2, quantity: 7, hasQuantity: true },
  { key: "item:other", name: "Chairs", requests: 1, quantity: 1, hasQuantity: false },
  { key: "name:Chairs", name: "Chairs", requests: 1, quantity: 1, hasQuantity: false },
]);
console.log("To-do checks passed: estimates, overflow, quantities, phone, dates, slugs, throttle, editor, marked-list submissions and response tallies.");
