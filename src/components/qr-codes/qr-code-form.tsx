"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_DARK, ensureScannableDark } from "@/lib/cards/qr-colour";
import { normaliseLogoUrl } from "@/lib/qr-codes/links";
import {
  CORNER_STYLES,
  CORNER_STYLE_LABELS,
  DENSITIES,
  DENSITY_LABELS,
  DOT_STYLES,
  DOT_STYLE_LABELS,
  FRAME_TEXT_MAX,
  cleanFrameText,
  layoutQr,
  layoutToSvg,
  type Background,
  type CornerStyle,
  type Density,
  type DotStyle,
} from "@/lib/qr-codes/design";
import type { QrFormSection, QrFormState } from "@/lib/actions/qr-codes";
import { cn } from "@/lib/utils";
import { FormSection } from "./form-section";
import { StyleIcon } from "./style-icon";
import { LocalDateTimeInput, LocalTime } from "./local-time";

export type QrCodeFormValues = {
  id?: string;
  name: string;
  destination: string;
  colour: string;
  logo_url: string;
  dot_style: DotStyle;
  corner_style: CornerStyle;
  /** Empty when corners match the dots. */
  corner_colour: string;
  background: Background;
  frame_text: string;
  density: Density;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  ios_destination: string;
  android_destination: string;
  /** ISO string, or null for no expiry. */
  expires_at: string | null;
  expired_destination: string;
  hasPassword: boolean;
};

/** A company's saved brand, offered as a one-click starting style. */
export type BrandPreset = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  logoUrl: string | null;
};

type Props = {
  action: (state: QrFormState, form: FormData) => Promise<QrFormState>;
  initial: QrCodeFormValues;
  brands: BrandPreset[];
  /** What the code encodes. A placeholder on the create page. */
  encodedUrl: string;
  submitLabel: string;
};

type FoldedSection = Exclude<QrFormSection, "basics">;

/** Example text in empty boxes, kept faint so it never reads as a saved value. */
const HINT = "placeholder:text-muted-foreground/50";

/**
 * Create and edit form for a dynamic QR code.
 *
 * Name and destination are always open, since most edits touch only those.
 * Everything else folds away behind a header that summarises its current
 * setting. A section opens by itself when a save fails because of it.
 *
 * The preview redraws as the colour or logo changes. The destination never
 * changes the image: the code always encodes the permanent short link.
 */
export function QrCodeForm({ action, initial, brands, encodedUrl, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [colour, setColour] = useState(initial.colour || BRAND_DARK);
  const [logo, setLogo] = useState(initial.logo_url);
  const [dotStyle, setDotStyle] = useState<DotStyle>(initial.dot_style);
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>(initial.corner_style);
  const [cornerColour, setCornerColour] = useState(initial.corner_colour);
  const [background, setBackground] = useState<Background>(initial.background);
  const [frameText, setFrameText] = useState(initial.frame_text);
  const [density, setDensity] = useState<Density>(initial.density);

  // Mirrored only to keep the section summaries current.
  const [utm, setUtm] = useState({
    source: initial.utm_source,
    medium: initial.utm_medium,
    campaign: initial.utm_campaign,
  });
  const [ios, setIos] = useState(initial.ios_destination);
  const [android, setAndroid] = useState(initial.android_destination);
  const [expiryIso, setExpiryIso] = useState(initial.expires_at ?? "");

  const [open, setOpen] = useState<Partial<Record<FoldedSection, boolean>>>({});
  const toggle = (id: FoldedSection) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  // Open the section behind a failed save. Done while rendering, keyed on the
  // error's timestamp, so the same error twice still reopens it.
  const [seenErrorAt, setSeenErrorAt] = useState(state.errorAt);
  if (state.errorAt !== seenErrorAt) {
    setSeenErrorAt(state.errorAt);
    const section = state.section;
    if (section && section !== "basics") setOpen((o) => ({ ...o, [section]: true }));
  }

  const dark = ensureScannableDark(colour);
  const safeLogo = normaliseLogoUrl(logo);

  const cornerDark = cornerColour ? ensureScannableDark(cornerColour) : dark;
  const frame = cleanFrameText(frameText);
  const darkened = [
    dark !== colour && `dots ${dark}`,
    cornerColour && cornerDark !== cornerColour && `corners ${cornerDark}`,
  ].filter(Boolean);

  // Drawn by the same code as the downloads, so the preview is exact.
  const previewSvg = useMemo(() => {
    const layout = layoutQr(encodedUrl, {
      dotStyle,
      cornerStyle,
      colour,
      cornerColour: cornerColour || null,
      background,
      frameText: frame,
      hasLogo: Boolean(safeLogo),
      density,
    });
    return {
      svg: layoutToSvg(layout, { logoHref: safeLogo, pixelWidth: 480 }),
      grid: layout.gridSize,
    };
  }, [encodedUrl, dotStyle, cornerStyle, colour, cornerColour, background, frame, safeLogo, density]);

  function applyBrand(id: string) {
    const brand = brands.find((b) => b.id === id);
    if (!brand) return;
    setColour(brand.primary.toUpperCase());
    setCornerColour(brand.accent.toUpperCase());
    if (brand.logoUrl) setLogo(brand.logoUrl);
    toast.success(`${brand.name} brand applied`);
  }

  // Edits stay on the page, so a successful save needs its own confirmation.
  useEffect(() => {
    if (state.savedAt) toast.success("Saved");
  }, [state.savedAt]);

  // Submitted by hand rather than through the form's action prop: React resets
  // a form after an action runs, which would wipe what was typed whenever
  // validation fails.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const tags = [utm.source, utm.medium, utm.campaign].map((v) => v.trim()).filter(Boolean);
  const devices = [ios.trim() && "iPhone", android.trim() && "Android"].filter(Boolean);

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem]"
    >
      <div className="max-w-xl">
        {initial.id && <input type="hidden" name="qr_code_id" value={initial.id} />}

        <div className="space-y-5">
          <Field label="Name" hint="Only you see this." required>
            <Input
              name="name"
              defaultValue={initial.name}
              placeholder="e.g. Restaurant menu, table tents"
              className={HINT}
              required
            />
          </Field>

          <Field
            label="Destination"
            hint="Where scans go. Change it any time; printed codes follow."
            required
          >
            <Input
              name="destination"
              defaultValue={initial.destination}
              placeholder="https://example.com/menu"
              className={HINT}
              inputMode="url"
              required
            />
          </Field>
        </div>

        <p className="mt-8 text-xs font-medium text-muted-foreground">More options</p>
        <div className="mt-2 divide-y overflow-hidden rounded-lg border">
          <FormSection
            id="style"
            title="Style"
            open={Boolean(open.style)}
            onToggle={() => toggle("style")}
            summary={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-3 rounded-full border"
                  style={{ backgroundColor: dark }}
                  aria-hidden="true"
                />
                {DENSITY_LABELS[density]}, {DOT_STYLE_LABELS[dotStyle].toLowerCase()} dots
                {safeLogo ? ", logo" : ""}
                {frame ? ", frame" : ""}
                {background === "transparent" ? ", clear" : ""}
              </span>
            }
          >
            {brands.length > 0 && (
              <Field label="Start from a company brand">
                <select
                  value=""
                  onChange={(e) => applyBrand(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Choose a company...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <ChoiceRow
              label="Density"
              name="density"
              value={density}
              options={DENSITIES.map((v) => ({ value: v, label: DENSITY_LABELS[v] }))}
              onChange={(v) => setDensity(v as Density)}
              icon={(v) => <StyleIcon kind="density" variant={v} />}
            />
            <p className="-mt-1 text-xs text-muted-foreground">
              {density === "detailed"
                ? "More, smaller squares with the strongest damage protection. Best for large prints, rough surfaces and busy logos."
                : "Fewer, bigger squares that scan faster, from farther away and at small sizes like business cards and stickers."}{" "}
              This one is {previewSvg.grid} by {previewSvg.grid} squares.
            </p>

            <ChoiceRow
              label="Dots"
              name="dot_style"
              value={dotStyle}
              options={DOT_STYLES.map((v) => ({ value: v, label: DOT_STYLE_LABELS[v] }))}
              onChange={(v) => setDotStyle(v as DotStyle)}
              icon={(v) => <StyleIcon kind="dot" variant={v} />}
            />
            <ChoiceRow
              label="Corners"
              name="corner_style"
              value={cornerStyle}
              options={CORNER_STYLES.map((v) => ({ value: v, label: CORNER_STYLE_LABELS[v] }))}
              onChange={(v) => setCornerStyle(v as CornerStyle)}
              icon={(v) => <StyleIcon kind="corner" variant={v} />}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Dot colour">
                <ColourInput value={colour} onChange={setColour} name="colour" label="Dot colour" />
              </Field>
              <Field label="Corner colour">
                <div className="flex items-center gap-3">
                  <ColourInput
                    value={cornerColour || colour}
                    onChange={setCornerColour}
                    name="corner_colour"
                    submitValue={cornerColour}
                    label="Corner colour"
                    disabled={!cornerColour}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!cornerColour}
                      onChange={(e) => setCornerColour(e.target.checked ? "" : colour)}
                      className="size-4 cursor-pointer accent-foreground"
                    />
                    Same as dots
                  </label>
                </div>
              </Field>
            </div>
            {darkened.length > 0 && (
              <p className="qr-rise text-xs text-muted-foreground">
                Too light to scan, so printed darker: {darkened.join(", ")}.
              </p>
            )}

            <Field label="Centre logo URL" hint="https address or /path in public.">
              <Input
                name="logo_url"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className={HINT}
              />
            </Field>

            <Field
              label="Frame label"
              hint={`Adds a border with this text under the code, e.g. "Scan for the menu". Up to ${FRAME_TEXT_MAX} characters; leave blank for no frame.`}
            >
              <Input
                name="frame_text"
                value={frameText}
                onChange={(e) => setFrameText(e.target.value)}
                maxLength={FRAME_TEXT_MAX}
                placeholder="e.g. Scan to register"
                className={HINT}
              />
            </Field>

            <ChoiceRow
              label="Background"
              name="background"
              value={background}
              options={[
                { value: "white", label: "White" },
                { value: "transparent", label: "Clear" },
              ]}
              onChange={(v) => setBackground(v as Background)}
            />
            {background === "transparent" && (
              <p className="qr-rise text-xs text-muted-foreground">
                Only print a clear code on a plain, light surface. Phones struggle
                to read it on dark or busy backgrounds.
              </p>
            )}
          </FormSection>

          <FormSection
            id="tracking"
            title="Tracking tags"
            open={Boolean(open.tracking)}
            onToggle={() => toggle("tracking")}
            summary={tags.length ? tags.join(" / ") : "Off"}
          >
            <p className="text-xs text-muted-foreground">
              Added to the destination on every scan, so Google Analytics and
              similar tools can tell QR visits apart.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Source">
                <Input
                  name="utm_source"
                  value={utm.source}
                  onChange={(e) => setUtm((u) => ({ ...u, source: e.target.value }))}
                  placeholder="e.g. qr"
                  className={HINT}
                />
              </Field>
              <Field label="Medium">
                <Input
                  name="utm_medium"
                  value={utm.medium}
                  onChange={(e) => setUtm((u) => ({ ...u, medium: e.target.value }))}
                  placeholder="e.g. print"
                  className={HINT}
                />
              </Field>
              <Field label="Campaign">
                <Input
                  name="utm_campaign"
                  value={utm.campaign}
                  onChange={(e) => setUtm((u) => ({ ...u, campaign: e.target.value }))}
                  placeholder="e.g. spring-menu"
                  className={HINT}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="devices"
            title="Device links"
            open={Boolean(open.devices)}
            onToggle={() => toggle("devices")}
            summary={devices.length ? devices.join(" and ") : "Off"}
          >
            <p className="text-xs text-muted-foreground">
              Send iPhones and Android phones somewhere else, like your App Store
              and Play Store pages. Everyone else gets the destination above.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="iPhone and iPad">
                <Input
                  name="ios_destination"
                  value={ios}
                  onChange={(e) => setIos(e.target.value)}
                  placeholder="https://apps.apple.com/..."
                  className={HINT}
                  inputMode="url"
                />
              </Field>
              <Field label="Android">
                <Input
                  name="android_destination"
                  value={android}
                  onChange={(e) => setAndroid(e.target.value)}
                  placeholder="https://play.google.com/..."
                  className={HINT}
                  inputMode="url"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="expiry"
            title="Expiry"
            open={Boolean(open.expiry)}
            onToggle={() => toggle("expiry")}
            summary={
              expiryIso ? (
                <>
                  Expires <LocalTime iso={expiryIso} />
                </>
              ) : (
                "Never"
              )
            }
          >
            <p className="text-xs text-muted-foreground">
              After this time, scans go to the follow-up link, or to a
              &ldquo;not available&rdquo; page if you leave it blank.
            </p>
            <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <Field label="Expires at">
                <LocalDateTimeInput
                  name="expires_at"
                  defaultIso={initial.expires_at}
                  onIsoChange={setExpiryIso}
                />
              </Field>
              <Field label="Then send scans to">
                <Input
                  name="expired_destination"
                  defaultValue={initial.expired_destination}
                  placeholder="https://example.com/offer-ended"
                  className={HINT}
                  inputMode="url"
                />
              </Field>
            </div>
          </FormSection>

          {/* Remounted after each save, which clears the typed password. */}
          <PasswordSection
            key={state.savedAt ?? 0}
            hasPassword={initial.hasPassword}
            open={Boolean(open.password)}
            onToggle={() => toggle("password")}
          />
        </div>

        {/* Stays in reach while scrolling through open sections. */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-background/85 px-3 py-3 backdrop-blur">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </Button>
          {state.error && (
            <p key={state.errorAt} role="alert" className="qr-rise text-sm text-destructive">
              {state.error}
            </p>
          )}
        </div>
      </div>

      <aside className="md:sticky md:top-24 md:self-start">
        <p className="nf-eyebrow">Preview</p>
        <div
          className={cn(
            "mt-3 w-full max-w-64 overflow-hidden rounded-2xl border p-3",
            background === "white" ? "bg-white" : "qr-checker"
          )}
        >
          <div
            // Remounts on each design change so the new drawing fades in.
            key={[dotStyle, cornerStyle, dark, cornerDark, background, frame, safeLogo, density].join("|")}
            role="img"
            aria-label="QR code preview"
            className="qr-fade [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            // Built by layoutToSvg, which escapes every user-supplied value.
            dangerouslySetInnerHTML={{ __html: previewSvg.svg }}
          />
        </div>
        <p
          className={cn(
            "mt-3 break-all font-mono text-xs text-muted-foreground",
            !initial.id && "opacity-70"
          )}
        >
          {initial.id ? encodedUrl : "Your permanent link is created when you save."}
        </p>
      </aside>
    </form>
  );
}

function PasswordSection({
  hasPassword,
  open,
  onToggle,
}: {
  hasPassword: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const [removePassword, setRemovePassword] = useState(false);
  const [typed, setTyped] = useState(false);

  const summary = removePassword
    ? "Will be removed"
    : typed
      ? hasPassword
        ? "Will change"
        : "Will be set"
      : hasPassword
        ? "On"
        : "Off";

  return (
    <FormSection id="password" title="Password" open={open} onToggle={onToggle} summary={summary}>
      <p className="text-xs text-muted-foreground">
        {hasPassword
          ? "This code asks for a password. Type a new one to change it."
          : "Scanners must type this before they are sent on."}
      </p>
      <div
        className={cn(
          "transition-opacity duration-200",
          removePassword && "pointer-events-none opacity-40"
        )}
      >
        <Input
          name="password"
          type="password"
          aria-label="Password"
          autoComplete="new-password"
          placeholder={hasPassword ? "Leave blank to keep the current one" : "At least 4 characters"}
          className={HINT}
          disabled={removePassword}
          onChange={(e) => setTyped(e.target.value !== "")}
        />
      </div>
      {hasPassword && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remove_password"
            checked={removePassword}
            onChange={(e) => setRemovePassword(e.target.checked)}
            className="size-4 cursor-pointer accent-foreground"
          />
          Remove password
        </label>
      )}
    </FormSection>
  );
}

function ChoiceRow({
  label,
  name,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: (value: string) => React.ReactNode;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
              "transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]",
              "has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
              value === o.value ? "border-foreground bg-accent" : "hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {icon?.(o.value)}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ColourInput({
  value,
  onChange,
  name,
  label,
  submitValue,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  name: string;
  label: string;
  /** What the form sends, when it differs from what is shown. */
  submitValue?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-opacity duration-200",
        disabled && "opacity-40"
      )}
    >
      <input
        type="color"
        value={value.toLowerCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label={label}
        disabled={disabled}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1 disabled:cursor-default"
      />
      <input type="hidden" name={name} value={submitValue ?? value} />
      <span className="font-mono text-xs text-muted-foreground">{value}</span>
    </div>
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
