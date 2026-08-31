"use client";

import { useState } from "react";
import { BrandCorner } from "@/components/cards/brand-corner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CompanyFormValues = {
  id?: string;
  name: string;
  legal_name: string;
  website: string;
  website_label: string;
  logo_url: string;
  cover_image_url: string;
  tagline: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  brand_ink: string;
};

const BRAND_FIELDS = [
  { key: "brand_primary", label: "Primary" },
  { key: "brand_secondary", label: "Secondary" },
  { key: "brand_accent", label: "Accent" },
  { key: "brand_ink", label: "Text" },
] as const;

/**
 * Company details and branding. The preview is the point: colours are hard to
 * judge as hex values, so the corner motif and a sample card render live as
 * they are picked.
 */
export function CompanyForm({
  action,
  initial,
  submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  initial: CompanyFormValues;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);

  function set<K extends keyof CompanyFormValues>(
    key: K,
    value: CompanyFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      {values.id && <input type="hidden" name="organisation_id" value={values.id} />}

      <div className="space-y-5">
        <Field label="Company name" required>
          <Input
            name="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
            placeholder="Energy 4 Impact"
          />
        </Field>

        <Field
          label="Legal name"
          hint="Written into the saved contact. Defaults to the company name."
        >
          <Input
            name="legal_name"
            value={values.legal_name}
            onChange={(e) => set("legal_name", e.target.value)}
            placeholder="Same as company name"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website">
            <Input
              name="website"
              type="url"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://www.energy4impact.org"
            />
          </Field>
          <Field label="Website label" hint="How the link reads on the card.">
            <Input
              name="website_label"
              value={values.website_label}
              onChange={(e) => set("website_label", e.target.value)}
              placeholder="www.energy4impact.org"
            />
          </Field>
        </div>

        <Field label="Logo URL" hint="Transparent PNG or SVG works best.">
          <Input
            name="logo_url"
            value={values.logo_url}
            onChange={(e) => set("logo_url", e.target.value)}
            placeholder="/brand/energy4impact.png"
          />
        </Field>

        <Field
          label="Cover image URL"
          hint="Wide banner shown at the top of profile-template cards. Without one they use a solid brand-colour header."
        >
          <Input
            name="cover_image_url"
            value={values.cover_image_url}
            onChange={(e) => set("cover_image_url", e.target.value)}
            placeholder="https://…/cover.jpg"
          />
        </Field>

        <Field label="Tagline" hint="Shown in the footer of every card.">
          <Input
            name="tagline"
            value={values.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="Putting energy at the heart of development."
          />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Brand colours</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BRAND_FIELDS.map(({ key, label }) => (
              <label key={key} className="space-y-1.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={values[key]}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    aria-label={`${label} colour`}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                  />
                  <Input
                    name={key}
                    value={values[key]}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    pattern="#[0-9a-fA-F]{6}"
                    className="font-mono text-xs"
                  />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit">{submitLabel}</Button>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        {/* The plate is always white, so text colours must be set explicitly:
            inheriting the dashboard's foreground renders white on white in
            dark mode. */}
        <div
          className="mt-3 max-w-sm overflow-hidden rounded-2xl border bg-white"
          style={
            {
              "--brand-primary": values.brand_primary,
              "--brand-secondary": values.brand_secondary,
              "--brand-accent": values.brand_accent,
              "--brand-ink": values.brand_ink,
            } as React.CSSProperties
          }
        >
          <div className="relative overflow-hidden">
            <BrandCorner className="absolute left-0 top-0 h-full w-auto" />
            <div className="relative flex flex-col items-end py-8 pl-20 pr-5 text-right">
              {values.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logo_url}
                  alt=""
                  className="mb-4 h-6 w-auto object-contain"
                />
              ) : (
                <span
                  className="mb-4 text-sm font-semibold"
                  style={{ color: values.brand_ink }}
                >
                  {values.name || "Company"}
                </span>
              )}
              <span
                className="text-xl leading-tight"
                style={{
                  fontFamily: "ui-serif, Georgia, serif",
                  color: "#000",
                }}
              >
                Ada Kimani
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: values.brand_accent }}
              >
                Programme Lead
              </span>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div
              className="rounded-lg px-4 py-2.5 text-center text-xs font-semibold text-white"
              style={{ backgroundColor: values.brand_accent }}
            >
              Save to contacts
            </div>
          </div>
          {values.tagline && (
            <div
              className="border-t px-5 py-3 text-center text-xs italic"
              style={{ color: values.brand_primary }}
            >
              {values.tagline}
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
