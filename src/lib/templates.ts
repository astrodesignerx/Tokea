export const TEMPLATE_OPTIONS = [
  { value: "image-led", label: "Image-led", description: "Full-bleed cover, centered title. Weddings, parties." },
  { value: "type-led", label: "Type-led", description: "Cover on the right, content left. Corporate, launches." },
  { value: "minimal", label: "Minimal", description: "Single column, generous space. Dinners, meetups." },
  { value: "birthday", label: "Birthday", description: "Playful, lively, large numerals. Birthdays." },
  { value: "conference", label: "Conference", description: "Schedule and speakers. Summits, conferences." },
] as const;

export type TemplateId = (typeof TEMPLATE_OPTIONS)[number]["value"];

export const TEMPLATE_IDS = TEMPLATE_OPTIONS.map((t) => t.value);
