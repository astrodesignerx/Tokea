import { z } from "zod";

/**
 * Form fields, shared by the builder in the browser and by the server that
 * validates submissions. Nothing here may import the database, so the same
 * rules run on both sides.
 */

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "date",
  "single_choice",
  "multi_choice",
  "dropdown",
  "yes_no",
  "rating",
  "heading",
  "consent",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** Palette copy. "Paragraph" rather than "long text", the words people use. */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short answer",
  long_text: "Paragraph",
  email: "Email",
  phone: "Phone (+254)",
  number: "Number",
  date: "Date",
  single_choice: "One choice",
  multi_choice: "Several choices",
  dropdown: "Dropdown",
  yes_no: "Yes or no",
  rating: "Rating",
  heading: "Section heading",
  consent: "Consent",
};

/** The palette's three groups, in the order they are drawn. */
export const FIELD_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: "Text", types: ["short_text", "long_text", "email", "phone"] },
  { label: "Choice", types: ["single_choice", "multi_choice", "dropdown", "yes_no", "rating"] },
  { label: "Other", types: ["date", "number", "heading", "consent"] },
];

export const CHOICE_TYPES: FieldType[] = ["single_choice", "multi_choice", "dropdown"];

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  help?: string;
  required: boolean;
  options?: string[];
  /** Rating only: the words at each end of the 1 to 5 scale. */
  low_label?: string;
  high_label?: string;
};

export const MAX_FIELDS = 50;
export const MAX_LABEL_LENGTH = 200;
export const MAX_HELP_LENGTH = 300;
export const MAX_OPTIONS = 30;
export const MAX_OPTION_LENGTH = 100;
export const MAX_SCALE_LABEL_LENGTH = 60;

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 8;
const ID_PATTERN = /^[a-z0-9]{8}$/;

/**
 * A field id, made once and kept across versions so old answers still line up
 * with the question they answered.
 */
export function newFieldId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < ID_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return id;
}

export type ParseFieldsResult = { fields: FormField[] } | { error: string };

/**
 * Validates whatever the builder saved. Accepts the parsed JSON Prisma hands
 * back, or the string a browser sent, and returns the normalised fields or the
 * first problem in words someone can act on.
 */
export function parseFields(json: unknown): ParseFieldsResult {
  let value = json;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { error: "The questions could not be read." };
    }
  }

  if (!Array.isArray(value)) return { error: "The questions could not be read." };
  if (value.length > MAX_FIELDS) {
    return { error: `A form can have at most ${MAX_FIELDS} questions.` };
  }

  const fields: FormField[] = [];
  const ids = new Set<string>();

  for (let index = 0; index < value.length; index++) {
    const raw = value[index] as Record<string, unknown> | null;
    const position = `Question ${index + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `${position} could not be read.` };
    }

    const id = typeof raw.id === "string" ? raw.id : "";
    if (!ID_PATTERN.test(id)) return { error: `${position} has an invalid id.` };
    if (ids.has(id)) return { error: `${position} repeats another question's id.` };
    ids.add(id);

    const type = raw.type;
    if (typeof type !== "string" || !FIELD_TYPES.includes(type as FieldType)) {
      return { error: `${position} has an unknown type.` };
    }
    const fieldType = type as FieldType;

    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!label) return { error: `${position} needs a label.` };
    if (label.length > MAX_LABEL_LENGTH) {
      return { error: `${position}'s label is longer than ${MAX_LABEL_LENGTH} characters.` };
    }

    const help = typeof raw.help === "string" ? raw.help.trim() : "";
    if (help.length > MAX_HELP_LENGTH) {
      return { error: `${position}'s help text is longer than ${MAX_HELP_LENGTH} characters.` };
    }

    // A heading is a label on a group of questions, never something to answer.
    const required = fieldType === "heading" ? false : raw.required === true;

    const field: FormField = { id, type: fieldType, label, required };
    if (help) field.help = help;

    if (CHOICE_TYPES.includes(fieldType)) {
      if (!Array.isArray(raw.options)) return { error: `${position} needs at least one option.` };
      const options: string[] = [];
      for (const option of raw.options) {
        if (typeof option !== "string") return { error: `${position} has an option that could not be read.` };
        const cleaned = option.trim();
        if (!cleaned) continue;
        if (cleaned.length > MAX_OPTION_LENGTH) {
          return { error: `Each option must be ${MAX_OPTION_LENGTH} characters or fewer.` };
        }
        options.push(cleaned);
      }
      const unique = new Set(options);
      if (unique.size !== options.length) {
        return { error: `${position} has the same option twice.` };
      }
      if (options.length === 0) return { error: `${position} needs at least one option.` };
      if (options.length > MAX_OPTIONS) {
        return { error: `${position} can have at most ${MAX_OPTIONS} options.` };
      }
      field.options = options;
    }

    // A rating is always 1 to 5; only the words at each end are editable.
    if (fieldType === "rating") {
      const low = typeof raw.low_label === "string" ? raw.low_label.trim() : "";
      const high = typeof raw.high_label === "string" ? raw.high_label.trim() : "";
      if (low.length > MAX_SCALE_LABEL_LENGTH || high.length > MAX_SCALE_LABEL_LENGTH) {
        return {
          error: `Scale labels must be ${MAX_SCALE_LABEL_LENGTH} characters or fewer.`,
        };
      }
      if (low) field.low_label = low;
      if (high) field.high_label = high;
    }

    fields.push(field);
  }

  return { fields };
}

/** Strip spaces, dashes and brackets so the same number can be typed any way. */
function cleanPhone(input: string): string {
  return input.replace(/[\s\-()]/g, "");
}

/**
 * Kenyan mobile numbers only, stored in one shape: +2547XXXXXXXX. Accepts the
 * ways people write them locally and internationally, with spaces or dashes.
 */
export function normaliseKenyanPhone(input: string): string | null {
  const cleaned = cleanPhone(input.trim());
  let national = "";

  if (cleaned.startsWith("+254")) national = cleaned.slice(4);
  else if (cleaned.startsWith("254") && cleaned.length === 12) national = cleaned.slice(3);
  else if (cleaned.startsWith("0") && cleaned.length === 10) national = cleaned.slice(1);
  else if (cleaned.length === 9) national = cleaned;

  return /^[71]\d{8}$/.test(national) ? `+254${national}` : null;
}

/** Empty strings and whitespace count as "not answered", not as an answer. */
function blankToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const REQUIRED_TEXT = "This question needs an answer.";

type AnswerShape = Record<string, z.ZodTypeAny>;

/**
 * The zod schema a submission is checked against. Built from the version the
 * visitor was shown, so a form edited mid-fill still accepts what it displayed.
 *
 * Unknown keys are dropped and unanswered optional questions are left out, so
 * stored answers only ever hold real answers.
 */
export function buildAnswerSchema(fields: FormField[]): z.ZodType<Record<string, unknown>> {
  const shape: AnswerShape = {};

  for (const field of fields) {
    if (field.type === "heading") continue;
    shape[field.id] = fieldSchema(field);
  }

  return z.object(shape).transform((answers) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (value !== undefined) out[key] = value;
    }
    return out;
  });
}

function fieldSchema(field: FormField): z.ZodTypeAny {
  const required = field.required;

  switch (field.type) {
    case "short_text":
    case "long_text": {
      const max = field.type === "short_text" ? 300 : 5000;
      return z.preprocess(
        blankToUndefined,
        required
          ? z.string({ required_error: REQUIRED_TEXT }).trim().min(1, REQUIRED_TEXT).max(max, `Keep this under ${max} characters.`)
          : z.string().trim().max(max, `Keep this under ${max} characters.`).optional(),
      );
    }

    case "email":
      return z.preprocess(
        blankToUndefined,
        required
          ? z
              .string({ required_error: REQUIRED_TEXT })
              .trim()
              .toLowerCase()
              .max(200, "That email is too long.")
              .email("Enter an email address.")
          : z
              .string()
              .trim()
              .toLowerCase()
              .max(200, "That email is too long.")
              .email("Enter an email address.")
              .optional(),
      );

    case "phone":
      return z.preprocess(
        blankToUndefined,
        (required
          ? z.string({ required_error: REQUIRED_TEXT }).trim()
          : z.string().trim().optional()
        )
          .transform((value) => (value === undefined ? undefined : normaliseKenyanPhone(value)))
          .refine(
            (value) => (value === undefined ? !required : value !== null),
            "Enter a Kenyan phone number, like 0712 345 678.",
          ),
      );

    case "number":
      return z.preprocess(
        (value) => {
          const cleaned = blankToUndefined(value);
          if (cleaned === undefined) return undefined;
          return typeof cleaned === "string" ? Number(cleaned) : cleaned;
        },
        (required
          ? z.number({
              required_error: "Enter a number.",
              invalid_type_error: "Enter a number.",
            })
          : z.number({ invalid_type_error: "Enter a number." }).optional()
        ).refine(
          (value) => value === undefined || Number.isFinite(value),
          "Enter a number.",
        ),
      );

    case "date":
      return z.preprocess(
        blankToUndefined,
        required
          ? z
              .string({ required_error: REQUIRED_TEXT })
              .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
          : z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").optional(),
      );

    case "single_choice":
    case "dropdown": {
      const options = field.options ?? [];
      return z.preprocess(
        blankToUndefined,
        required
          ? z
              .string({ required_error: "Choose an answer." })
              .refine((value) => options.includes(value), "Choose one of the options.")
          : z
              .string()
              .refine((value) => options.includes(value), "Choose one of the options.")
              .optional(),
      );
    }

    case "multi_choice": {
      const options = field.options ?? [];
      const list = z.array(z.string()).superRefine((values, ctx) => {
        if (values.some((value) => !options.includes(value))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose from the options." });
        }
        if (required && values.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose at least one option.",
          });
        }
      });
      return z.preprocess((value) => {
        if (value === undefined || value === null) return required ? [] : undefined;
        const values = Array.isArray(value) ? value : [value];
        if (values.length === 0) return required ? [] : undefined;
        return values;
      }, required ? list : list.optional());
    }

    case "yes_no":
      return required
        ? z.boolean({
            required_error: "Choose yes or no.",
            invalid_type_error: "Choose yes or no.",
          })
        : z.boolean({ invalid_type_error: "Choose yes or no." }).optional();

    case "rating":
      return z.preprocess(
        (value) => {
          const cleaned = blankToUndefined(value);
          if (cleaned === undefined) return undefined;
          return typeof cleaned === "string" ? Number(cleaned) : cleaned;
        },
        (required
          ? z.number({
              required_error: "Pick a rating from 1 to 5.",
              invalid_type_error: "Pick a rating from 1 to 5.",
            })
          : z
              .number({ invalid_type_error: "Pick a rating from 1 to 5." })
              .optional()
        ).refine(
          (value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 5),
          "Pick a rating from 1 to 5.",
        ),
      );

    case "consent":
      return required
        ? z.literal(true, {
            errorMap: () => ({ message: "Please tick to agree." }),
          })
        : z.boolean().optional();

    case "heading":
      // Headings are skipped before this runs; kept for exhaustiveness.
      return z.any().optional();
  }
}

/**
 * Turns a submitted FormData into the object the schema checks. Checkboxes
 * arrive only when ticked, and multiple choices arrive as repeated keys.
 */
export function readAnswers(
  fields: FormField[],
  formData: FormData,
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === "heading") continue;

    if (field.type === "multi_choice") {
      answers[field.id] = formData.getAll(field.id).map(String);
      continue;
    }

    if (field.type === "yes_no") {
      const value = formData.get(field.id);
      if (value === "yes") answers[field.id] = true;
      else if (value === "no") answers[field.id] = false;
      continue;
    }

    if (field.type === "consent") {
      answers[field.id] = formData.get(field.id) === "on";
      continue;
    }

    const value = formData.get(field.id);
    if (value !== null) answers[field.id] = String(value);
  }

  return answers;
}
