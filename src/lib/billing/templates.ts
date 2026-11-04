export const PUBLIC_TEMPLATES = ["classic", "minimal", "bold"] as const;
export const TEMPLATE_DETAILS = {
  classic: { label: "Classic", description: "A clear business layout with a familiar hierarchy." },
  minimal: { label: "Minimal", description: "Simple type and generous space around your content." },
  bold: { label: "Bold", description: "Strong brand colour and prominent document details." },
};

export function templatesFor(profile: { private_template?: string | null }) {
  const templates: { value: string; label: string; description: string }[] = PUBLIC_TEMPLATES.map((value) => ({ value, ...TEMPLATE_DETAILS[value] }));
  if (profile.private_template && !PUBLIC_TEMPLATES.includes(profile.private_template as typeof PUBLIC_TEMPLATES[number])) {
    templates.push({ value: profile.private_template, label: "Your design", description: "Your saved custom document design." });
  }
  return templates;
}
