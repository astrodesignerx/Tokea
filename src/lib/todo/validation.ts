import { z } from "zod";
import { LIST_STATUSES, normalisePhone, validEventDate } from "./logic";

const key = z.string().min(1).max(80);
const optionalText = (max: number) => z.string().trim().max(max);
const httpsImage = optionalText(2000).refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Photos must use an https URL.");

export const editorSchema = z.object({
  title: z.string().trim().min(1, "Give the list a title.").max(120),
  intro: optionalText(2000),
  organisation_id: optionalText(80),
  status: z.enum(LIST_STATUSES),
  layout: z.enum(["list", "visual"]),
  allow_view_switch: z.boolean(),
  show_prices: z.boolean(),
  ask_event_date: z.boolean(),
  notify_emails: z.array(z.string().max(2000)).max(100)
    .transform((values) => [...new Set(values.join("\n").split(/[\s,;]+/).filter(Boolean).map((email) => email.toLowerCase()))])
    .pipe(z.array(z.string().email().max(200)).max(5, "Add at most 5 email addresses.")),
  thank_you: optionalText(2000),
  updated_at: z.string(),
  sections: z.array(z.object({ id: key, title: z.string().trim().min(1).max(120) })).max(30),
  items: z.array(z.object({
    id: key,
    section_id: z.string().max(80),
    name: z.string().trim().min(1, "Give every service a name.").max(160),
    note: optionalText(500),
    image_url: httpsImage,
    price: optionalText(40),
    per_unit: z.boolean(),
    unit_label: optionalText(40),
    max_quantity: z.number().int().min(1).max(1000),
    active: z.boolean(),
  })).max(200),
}).superRefine((value, ctx) => {
  const ids = [...value.sections.map((s) => s.id), ...value.items.map((i) => i.id)];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Duplicate service or section." });
  if (value.items.some((i) => i.section_id && !value.sections.some((s) => s.id === i.section_id))) {
    ctx.addIssue({ code: "custom", message: "Choose a section from this list." });
  }
  if (value.status === "open" && !value.items.some((i) => i.active)) {
    ctx.addIssue({ code: "custom", message: "Add an active service before opening the list." });
  }
});

export type TodoEditorValue = z.infer<typeof editorSchema>;

export const submissionSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(160),
  phone: z.string().trim().max(60).transform(normalisePhone).refine((v) => v !== null, "Enter a valid phone number."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.").max(200)]),
  event_date: z.string().refine((v) => !v || validEventDate(v), "Enter a valid event date."),
  notes: z.string().trim().max(1000, "Keep additional requests to 1000 characters."),
  items: z.array(z.object({ id: key, quantity: z.number().finite() })).max(200),
})
  .refine((value) => value.items.length > 0 || value.notes.length > 0, {
    message: "Tick an item or tell us what else you need.", path: ["items"],
  })
  .refine((value) => new Set(value.items.map((i) => i.id)).size === value.items.length, "Choose each service once.");
