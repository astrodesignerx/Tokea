export const TEMPLATE_OPTIONS = [
  { value: "image-led", label: "Image-led", description: "Full-bleed cover, centered title. Weddings, parties." },
  { value: "type-led", label: "Type-led", description: "Cover on the right, content left. Corporate, launches." },
  { value: "minimal", label: "Minimal", description: "Single column, generous space. Dinners, meetups." },
  { value: "birthday", label: "Birthday", description: "Playful, lively, large numerals. Birthdays." },
  { value: "conference", label: "Conference", description: "Schedule and speakers. Summits, conferences." },
] as const;

export type TemplateId = (typeof TEMPLATE_OPTIONS)[number]["value"];

// Single source of truth for validation — keeps the zod enum in sync with the
// options the event form renders.
export const TEMPLATE_IDS = TEMPLATE_OPTIONS.map((t) => t.value) as [TemplateId, ...TemplateId[]];

/** Templates that actually render a cover image. The others ignore it. */
export const TEMPLATES_WITH_COVER: readonly TemplateId[] = ["image-led", "type-led"];

export const COVER_MOTION_IDS = ["none", "drift"] as const;
export type CoverMotion = (typeof COVER_MOTION_IDS)[number];

export function hasCover(template: string): boolean {
  return TEMPLATES_WITH_COVER.includes(template as TemplateId);
}
