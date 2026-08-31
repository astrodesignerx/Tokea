export const CARD_TEMPLATE_OPTIONS = [
  {
    value: "classic",
    label: "Classic",
    description: "The original card: corner motif, serif name, contact list.",
  },
  {
    value: "profile",
    label: "Profile",
    description:
      "Cover banner, centred identity, quick-action icons. vCard profile style.",
  },
] as const;

export type CardTemplateId = (typeof CARD_TEMPLATE_OPTIONS)[number]["value"];

// Single source of truth for validation, keeping the actions in sync with the
// options the card form renders.
export const CARD_TEMPLATE_IDS = CARD_TEMPLATE_OPTIONS.map(
  (t) => t.value
) as [CardTemplateId, ...CardTemplateId[]];

export const DEFAULT_CARD_TEMPLATE: CardTemplateId = "profile";
