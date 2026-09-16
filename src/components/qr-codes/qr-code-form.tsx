"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_DARK, ensureScannableDark } from "@/lib/cards/qr-colour";
import { normaliseLogoUrl } from "@/lib/qr-codes/links";
import type { QrFormSection, QrFormState } from "@/lib/actions/qr-codes";
import { cn } from "@/lib/utils";
import { FormSection } from "./form-section";
import { LocalDateTimeInput, LocalTime } from "./local-time";

export type QrCodeFormValues = {
  id?: string;
  name: string;
  destination: string;
  colour: string;
  logo_url: string;
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

type Props = {
  action: (state: QrFormState, form: FormData) => Promise<QrFormState>;
  initial: QrCodeFormValues;
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
export function QrCodeForm({ action, initial, encodedUrl, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [colour, setColour] = useState(initial.colour || BRAND_DARK);
  const [logo, setLogo] = useState(initial.logo_url);
  const [preview, setPreview] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(encodedUrl, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark, light: "#FFFFFF" },
    }).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [encodedUrl, dark]);

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
                {colour}, {safeLogo ? "with logo" : "no logo"}
              </span>
            }
          >
            <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Field label="Colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colour}
                    onChange={(e) => setColour(e.target.value.toUpperCase())}
                    aria-label="QR colour"
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  />
                  <input type="hidden" name="colour" value={colour} />
                  <span className="font-mono text-xs text-muted-foreground">{colour}</span>
                </div>
              </Field>
              <Field label="Centre logo URL" hint="https address or /path in public.">
                <Input
                  name="logo_url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className={HINT}
                />
              </Field>
            </div>
            {dark !== colour && (
              <p className="qr-rise text-xs text-muted-foreground">
                Darkened to {dark} on print so phones can still read it.
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
        <div className="relative mt-3 aspect-square w-full max-w-64 overflow-hidden rounded-2xl border bg-white p-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={preview}
              src={preview}
              alt="QR code preview"
              className="qr-fade size-full"
            />
          )}
          {safeLogo && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid size-[24%] place-items-center rounded-[18%] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={safeLogo}
                  alt=""
                  className="size-[72%] object-contain"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  onLoad={(e) => (e.currentTarget.style.visibility = "visible")}
                />
              </div>
            </div>
          )}
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
