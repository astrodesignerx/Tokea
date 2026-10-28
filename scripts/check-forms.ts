/**
 * Checks the pure form rules without a database or Next runtime.
 *
 *   pnpm exec tsx scripts/check-forms.ts
 *
 * Everything here runs offline: field parsing, answer validation and CSV
 * shaping. The database and browser paths are exercised by the app itself.
 */
import {
  FIELD_TYPES,
  buildAnswerSchema,
  normaliseKenyanPhone,
  parseFields,
  readAnswers,
  type FieldType,
  type FormField,
} from "../src/lib/forms/fields.js";
import { responsesToCsv } from "../src/lib/forms/csv.js";

let failures = 0;
let checks = 0;

function check(name: string, condition: boolean, detail?: string) {
  checks++;
  if (!condition) {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** A field with sensible defaults, so each test only states what it changes. */
function field(overrides: Partial<FormField> & { type: FieldType }): FormField {
  return {
    id: "ab12cd34",
    label: "A question",
    required: false,
    ...overrides,
  };
}

function schemaOf(fields: FormField[]) {
  return buildAnswerSchema(fields);
}

/** parseFields for tests that expect success; throws so a failure is loud. */
function fieldsOf(raw: unknown): FormField[] {
  const parsed = parseFields(raw);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.fields;
}

// ---------------------------------------------------------------------------
section("Phone numbers");

const validPhones: [string, string][] = [
  ["0712345678", "+254712345678"],
  ["0112345678", "+254112345678"],
  ["712345678", "+254712345678"],
  ["112345678", "+254112345678"],
  ["254712345678", "+254712345678"],
  ["+254712345678", "+254712345678"],
  ["254112345678", "+254112345678"],
  ["+254112345678", "+254112345678"],
  ["0712 345 678", "+254712345678"],
  ["+254 712-345-678", "+254712345678"],
  ["0712-345-678", "+254712345678"],
];

for (const [input, expected] of validPhones) {
  check(`phone ${input} -> ${expected}`, normaliseKenyanPhone(input) === expected, String(normaliseKenyanPhone(input)));
}

const badPhones = [
  "",
  "hello",
  "071234567",
  "07123456789",
  "0812345678",
  "0612345678",
  "+255712345678",
  "25471234567",
  "00254712345678",
  "0712-345-67a",
];

for (const input of badPhones) {
  check(`phone "${input}" rejected`, normaliseKenyanPhone(input) === null, String(normaliseKenyanPhone(input)));
}

// ---------------------------------------------------------------------------
section("parseFields shape");

const sample: FormField[] = [
  field({ id: "aaaa1111", type: "short_text", label: " Your name ", required: true }),
  field({ id: "bbbb2222", type: "email", label: "Email" }),
];

const sampleResult = parseFields(sample);
check("two valid fields parse", "fields" in sampleResult, "error" in sampleResult ? sampleResult.error : "");
if ("fields" in sampleResult) {
  check("labels are trimmed", sampleResult.fields[0].label === "Your name", sampleResult.fields[0].label);
  check("required is kept", sampleResult.fields[0].required);
  check("missing help is omitted", !("help" in sampleResult.fields[0]));
}

check("a JSON string is accepted", "fields" in parseFields(JSON.stringify(sample)));
check("broken JSON is rejected", "error" in parseFields("{oops"));
check("a non-array is rejected", "error" in parseFields({ fields: sample }));

// Limits
const tooMany = Array.from({ length: 51 }, (_, i) =>
  field({ id: `id${i.toString().padStart(6, "0")}`, type: "short_text" }),
);
check("51 fields rejected", "error" in parseFields(tooMany));

const fifty = tooMany.slice(0, 50);
check("50 fields allowed", "fields" in parseFields(fifty));

const longLabel = [field({ type: "short_text", label: "x".repeat(201) })];
check("201 character label rejected", "error" in parseFields(longLabel));
check("200 character label allowed", "fields" in parseFields([field({ type: "short_text", label: "x".repeat(200) })]));

check("301 character help rejected", "error" in parseFields([field({ type: "short_text", help: "x".repeat(301) })]));
check("300 character help allowed", "fields" in parseFields([field({ type: "short_text", help: "x".repeat(300) })]));

check("blank label rejected", "error" in parseFields([field({ type: "short_text", label: "   " })]));
check("missing label rejected", "error" in parseFields([{ id: "ab12cd34", type: "short_text", required: false }]));

check("duplicate ids rejected", "error" in parseFields([field({ type: "short_text" }), field({ type: "email" })]));
check(
  "a badly shaped id rejected",
  "error" in parseFields([field({ id: "AB12CD34", type: "short_text" })]),
);

check(
  "unknown type rejected",
  "error" in parseFields([{ ...field({ type: "short_text" }), type: "colour" }]),
);

// Choice options
const choiceField = (options: unknown) =>
  parseFields([{ id: "ab12cd34", type: "single_choice", label: "Pick", required: false, options }]);

check("no options rejected", "error" in choiceField([]));
check("missing options rejected", "error" in choiceField(undefined));
check("31 options rejected", "error" in choiceField(Array.from({ length: 31 }, (_, i) => `Option ${i}`)));
check("30 options allowed", "fields" in choiceField(Array.from({ length: 30 }, (_, i) => `Option ${i}`)));
check("duplicate options rejected", "error" in choiceField(["One", "One"]));
check("blank options are dropped", "fields" in choiceField(["One", "  ", "Two"]));
check("an empty option list after trimming is rejected", "error" in choiceField(["   "]));
check("a 101 character option rejected", "error" in choiceField(["x".repeat(101)]));
check("a 100 character option allowed", "fields" in choiceField(["x".repeat(100)]));

const heading = parseFields([{ id: "ab12cd34", type: "heading", label: "Group", required: true }]);
check(
  "headings are never required",
  "fields" in heading && heading.fields[0].required === false,
);

const rating = parseFields([
  { id: "ab12cd34", type: "rating", label: "Rate us", required: true, low_label: "Poor", high_label: "Great" },
]);
check(
  "rating labels are kept",
  "fields" in rating && rating.fields[0].low_label === "Poor" && rating.fields[0].high_label === "Great",
);

// ---------------------------------------------------------------------------
section("Answer schema: every field type");

const id = "ab12cd34";
const types: FieldType[] = [...FIELD_TYPES];

for (const type of types) {
  const base = field({
    id,
    type,
    required: type !== "heading",
    options: ["One", "Two"],
  });
  const parsed = parseFields([base]);
  check(`${type} parses`, "fields" in parsed, "error" in parsed ? parsed.error : "");
  if ("fields" in parsed) {
    const schema = schemaOf(parsed.fields);
    const valid: Record<FieldType, unknown> = {
      short_text: "Hello",
      long_text: "A longer answer",
      email: "Person@Example.com",
      phone: "0712 345 678",
      number: "42.5",
      date: "2026-10-27",
      single_choice: "One",
      multi_choice: ["One", "Two"],
      dropdown: "Two",
      yes_no: true,
      rating: 4,
      heading: undefined,
      consent: true,
    };
    const result = schema.safeParse(
      type === "heading" ? {} : { [id]: valid[type] },
    );
    check(`${type} accepts a good answer`, result.success, result.success ? "" : JSON.stringify(result.error.flatten()));
  }
}

// ---------------------------------------------------------------------------
section("Answer schema: rules per type");

const textMax = schemaOf(fieldsOf([field({ id, type: "short_text" })]));
check("short text over 300 rejected", !textMax.safeParse({ [id]: "x".repeat(301) }).success);
check("empty optional text omitted", Object.keys(textMax.parse({ [id]: "  " })).length === 0);

const longText = schemaOf(fieldsOf([field({ id, type: "long_text", required: true })]));
check("long text over 5000 rejected", !longText.safeParse({ [id]: "x".repeat(5001) }).success);
check("required long text missing rejected", !longText.safeParse({}).success);

const email = schemaOf(fieldsOf([field({ id, type: "email", required: true })]));
check(
  "email is trimmed and lower-cased",
  email.parse({ [id]: "  Person@Example.COM " })[id] === "person@example.com",
);
check("invalid email rejected", !email.safeParse({ [id]: "not-an-email" }).success);

const phone = schemaOf(fieldsOf([field({ id, type: "phone", required: true })]));
check("phone is normalised", phone.parse({ [id]: "0712-345-678" })[id] === "+254712345678");
check("invalid phone rejected", !phone.safeParse({ [id]: "0812345678" }).success);
check("optional phone can be empty", schemaOf(fieldsOf([field({ id, type: "phone" })])).safeParse({}).success);

const num = schemaOf(fieldsOf([field({ id, type: "number", required: true })]));
check("number accepts numeric text", num.parse({ [id]: "12.5" })[id] === 12.5);
check("number rejects text", !num.safeParse({ [id]: "twelve" }).success);
check("number rejects Infinity", !num.safeParse({ [id]: "Infinity" }).success);

const date = schemaOf(fieldsOf([field({ id, type: "date", required: true })]));
check("date accepts YYYY-MM-DD", date.safeParse({ [id]: "2026-10-27" }).success);
check("date rejects other formats", !date.safeParse({ [id]: "27/10/2026" }).success);

const single = schemaOf(fieldsOf([field({ id, type: "single_choice", required: true, options: ["One", "Two"] })]));
check("single choice accepts an option", single.safeParse({ [id]: "One" }).success);
check("single choice rejects a non-option", !single.safeParse({ [id]: "Three" }).success);
check("required single choice missing rejected", !single.safeParse({}).success);

const dropdown = schemaOf(fieldsOf([field({ id, type: "dropdown", required: false, options: ["One", "Two"] })]));
check("optional dropdown missing allowed", dropdown.safeParse({}).success);
check("dropdown rejects a non-option", !dropdown.safeParse({ [id]: "Three" }).success);

const multi = schemaOf(fieldsOf([field({ id, type: "multi_choice", required: true, options: ["One", "Two"] })]));
check("multi choice accepts a subset", multi.safeParse({ [id]: ["One"] }).success);
check("multi choice rejects a non-option", !multi.safeParse({ [id]: ["One", "Three"] }).success);
check("required multi choice needs one", !multi.safeParse({ [id]: [] }).success);
check("required multi choice missing rejected", !multi.safeParse({}).success);

const yesNo = schemaOf(fieldsOf([field({ id, type: "yes_no", required: true })]));
check("yes or no accepts true", yesNo.safeParse({ [id]: true }).success);
check("yes or no accepts false", yesNo.safeParse({ [id]: false }).success);
check("yes or no rejects text", !yesNo.safeParse({ [id]: "yes" }).success);

const ratingSchema = schemaOf(fieldsOf([field({ id, type: "rating", required: true })]));
check("rating accepts 1", ratingSchema.safeParse({ [id]: 1 }).success);
check("rating accepts 5", ratingSchema.safeParse({ [id]: 5 }).success);
check("rating rejects 0", !ratingSchema.safeParse({ [id]: 0 }).success);
check("rating rejects 6", !ratingSchema.safeParse({ [id]: 6 }).success);
check("rating rejects a fraction", !ratingSchema.safeParse({ [id]: 3.5 }).success);
check("rating casts numeric text", ratingSchema.safeParse({ [id]: "4" }).success);

const consent = schemaOf(fieldsOf([field({ id, type: "consent", required: true })]));
check("required consent needs true", consent.safeParse({ [id]: true }).success);
check("required consent rejects false", !consent.safeParse({ [id]: false }).success);
check("required consent rejects missing", !consent.safeParse({}).success);
const optionalConsent = schemaOf(fieldsOf([field({ id, type: "consent" })]));
check("optional consent can be missing", optionalConsent.safeParse({}).success);

// ---------------------------------------------------------------------------
section("Unknown keys and empty answers");

const mixed = schemaOf(
  fieldsOf([
    field({ id: "aaaa1111", type: "short_text" }),
    field({ id: "bbbb2222", type: "short_text" }),
    field({ id: "cccc3333", type: "heading", label: "Group" }),
  ]),
);
const dropped = mixed.parse({ aaaa1111: "Kept", zzzz9999: "Dropped", bbbb2222: "" });
check("unknown keys dropped", !("zzzz9999" in dropped), JSON.stringify(dropped));
check("empty optional omitted", !("bbbb2222" in dropped), JSON.stringify(dropped));
check("heading has no answer key", !("cccc3333" in dropped));

// readAnswers
const readFields: FormField[] = [
  field({ id: "aaaa1111", type: "short_text" }),
  field({ id: "bbbb2222", type: "multi_choice", options: ["One", "Two"], required: false }),
  field({ id: "cccc3333", type: "yes_no" }),
  field({ id: "dddd4444", type: "consent", required: true }),
  field({ id: "eeee5555", type: "rating" }),
  field({ id: "ffff6666", type: "heading", label: "Group" }),
];
const formData = new FormData();
formData.set("aaaa1111", "Wanjiru");
formData.append("bbbb2222", "One");
formData.append("bbbb2222", "Two");
formData.set("cccc3333", "yes");
formData.set("dddd4444", "on");
formData.set("eeee5555", "4");
const read = readAnswers(readFields, formData);
check("text is read", read.aaaa1111 === "Wanjiru");
check("multi choice collects every value", JSON.stringify(read.bbbb2222) === '["One","Two"]');
check("yes is a boolean", read.cccc3333 === true);
check("consent is a boolean", read.dddd4444 === true);
check("rating stays text for the schema", read.eeee5555 === "4");
check("heading is skipped", !("ffff6666" in read));

const unchecked = new FormData();
unchecked.set("cccc3333", "no");
const readNo = readAnswers(readFields, unchecked);
check("no is a boolean", readNo.cccc3333 === false);
check("unticked consent is false", readNo.dddd4444 === false);

// ---------------------------------------------------------------------------
section("CSV");

const fieldsV1 = [
  { id: "aaaa1111", type: "short_text", label: "Name", required: true },
  { id: "bbbb2222", type: "email", label: "Email", required: false },
];
const fieldsV2 = [
  { id: "aaaa1111", type: "short_text", label: "Full name", required: true },
  { id: "cccc3333", type: "single_choice", label: "Visit", required: false, options: ["One", "Two"] },
];
const fieldsV3 = [
  { id: "cccc3333", type: "single_choice", label: "Visit again", required: false, options: ["One", "Two"] },
  { id: "dddd4444", type: "heading", label: "Group" },
  { id: "eeee5555", type: "short_text", label: "Note", required: false },
];

const versions = [
  { id: "v1", number: 1, fields: fieldsV1 },
  { id: "v2", number: 2, fields: fieldsV2 },
  { id: "v3", number: 3, fields: fieldsV3 },
];

const submitted = new Date("2026-10-27T09:05:00.000Z");
const csv = responsesToCsv(versions, [
  {
    version_id: "v3",
    submitted_at: submitted,
    answers: { cccc3333: "Two", eeee5555: 'Comma, quote " and\nnewline' },
  },
  {
    version_id: "v1",
    submitted_at: submitted,
    answers: { aaaa1111: "=cmd|calc", bbbb2222: "a@b.com" },
  },
]);

check("CSV starts with a BOM", csv.charCodeAt(0) === 0xfeff, String(csv.charCodeAt(0)));

const rows = csv.slice(1).split("\r\n");
check("CSV uses CRLF and ends with one", csv.slice(1).endsWith("\r\n"));
check("Submitted and Version lead the header", rows[0].startsWith("Submitted,Version,"), rows[0]);

const header = rows[0].split(",");
check(
  "columns follow the newest version then older-only fields",
  header.join("|") === "Submitted|Version|Visit again|Note|Full name|Email",
  header.join("|"),
);
check("header uses the newest label for a repeated field", header.includes("Visit again") && !header.includes("Visit"));
check("headings are not columns", !header.includes("Group"));
check("new field from the oldest version comes last", header[header.length - 1] === "Email");

check("comma is quoted", csv.includes('"Comma, quote "" and\nnewline"'), csv);
check("quote is doubled", csv.includes('""'));
check("newline stays inside quotes", csv.includes("\n"));
check("formula gets a leading apostrophe", csv.includes("'=cmd|calc"), csv);
check("older version leaves a newer column empty", csv.includes(",1,,,"), csv);

// Row order is the caller's, and the version number is written for each row.
check("version numbers are written", csv.includes(",3,") && csv.includes(",1,"), csv);

// Formula guards cover every dangerous leading character.
const guarded = responsesToCsv(
  [{ id: "v1", number: 1, fields: [{ id: "aaaa1111", type: "short_text", label: "Answer", required: false }] }],
  [
    { version_id: "v1", submitted_at: submitted, answers: { aaaa1111: "+1" } },
    { version_id: "v1", submitted_at: submitted, answers: { aaaa1111: "-1" } },
    { version_id: "v1", submitted_at: submitted, answers: { aaaa1111: "@name" } },
  ],
);
check("plus is guarded", guarded.includes("'+1"), guarded);
check("minus is guarded", guarded.includes("'-1"), guarded);
check("at sign is guarded", guarded.includes("'@name"), guarded);

// Arrays, booleans and missing answers.
const rendered = responsesToCsv(
  [
    {
      id: "v1",
      number: 1,
      fields: [
        { id: "aaaa1111", type: "multi_choice", label: "Pick", required: false, options: ["One", "Two"] },
        { id: "bbbb2222", type: "yes_no", label: "Contact", required: false },
        { id: "cccc3333", type: "short_text", label: "Note", required: false },
      ],
    },
  ],
  [
    {
      version_id: "v1",
      submitted_at: submitted,
      answers: { aaaa1111: ["One", "Two"], bbbb2222: false },
    },
  ],
);
check("arrays join with semicolons", rendered.includes("One; Two"), rendered);
check("booleans read as words", rendered.includes(",No,"), rendered);
check("missing answers are empty cells", rendered.trimEnd().endsWith(",No,"), JSON.stringify(rendered));

// An empty form still produces a valid header.
const empty = responsesToCsv([], []);
check("empty export has a header", empty.slice(1).startsWith("Submitted,Version\r\n"), JSON.stringify(empty));

// ---------------------------------------------------------------------------
console.log("");
if (failures > 0) {
  console.log(`forms checks: ${failures} of ${checks} failed`);
  process.exit(1);
}
console.log("forms checks: all passed");
