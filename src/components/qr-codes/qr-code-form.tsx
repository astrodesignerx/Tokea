"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_DARK, ensureScannableDark } from "@/lib/cards/qr-colour";
import { normaliseLogoUrl } from "@/lib/qr-codes/links";
import type { QrFormState } from "@/lib/actions/qr-codes";
import { cn } from "@/lib/utils";
import { LocalDateTimeInput } from "./local-time";

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

/**
 * Create and edit form for a dynamic QR code, with a preview that redraws as
 * the colour or logo changes. The destination never changes the image: the
 * code always encodes the permanent short link.
 */
export function QrCodeForm({ action, initial, encodedUrl, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [colour, setColour] = useState(initial.colour || BRAND_DARK);
  const [logo, setLogo] = useState(initial.logo_url);
  const [preview, setPreview] = useState<string | null>(null);

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

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem]"
    >
      <div className="max-w-xl space-y-5">
        {initial.id && <input type="hidden" name="qr_code_id" value={initial.id} />}

        <Field label="Name" hint="Only you see this." required>
          <Input
            name="name"
            defaultValue={initial.name}
            placeholder="Restaurant menu, table tents"
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
            inputMode="url"
            required
          />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Style</legend>
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
              />
            </Field>
          </div>
          {dark !== colour && (
            <p className="qr-rise text-xs text-muted-foreground">
              Darkened to {dark} on print so phones can still read it.
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Campaign tags (optional)</legend>
          <p className="text-xs text-muted-foreground">
            Added to the destination on every scan, so Google Analytics and
            similar tools can tell QR visits apart.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Source">
              <Input name="utm_source" defaultValue={initial.utm_source} placeholder="qr" />
            </Field>
            <Field label="Medium">
              <Input name="utm_medium" defaultValue={initial.utm_medium} placeholder="print" />
            </Field>
            <Field label="Campaign">
              <Input
                name="utm_campaign"
                defaultValue={initial.utm_campaign}
                placeholder="spring-menu"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Device links (optional)</legend>
          <p className="text-xs text-muted-foreground">
            Send iPhones and Android phones somewhere else, like your App Store
            and Play Store pages. Everyone else gets the destination above.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="iPhone and iPad">
              <Input
                name="ios_destination"
                defaultValue={initial.ios_destination}
                placeholder="https://apps.apple.com/..."
                inputMode="url"
              />
            </Field>
            <Field label="Android">
              <Input
                name="android_destination"
                defaultValue={initial.android_destination}
                placeholder="https://play.google.com/..."
                inputMode="url"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Expiry (optional)</legend>
          <p className="text-xs text-muted-foreground">
            After this time, scans go to the follow-up link, or to a
            &ldquo;not available&rdquo; page if you leave it blank.
          </p>
          <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
            <Field label="Expires at">
              <LocalDateTimeInput name="expires_at" defaultIso={initial.expires_at} />
            </Field>
            <Field label="Then send scans to">
              <Input
                name="expired_destination"
                defaultValue={initial.expired_destination}
                placeholder="https://example.com/offer-ended"
                inputMode="url"
              />
            </Field>
          </div>
        </fieldset>

        {/* Remounted after each save, which clears the typed password. */}
        <PasswordFields key={state.savedAt ?? 0} hasPassword={initial.hasPassword} />

        {state.error && (
          <p role="alert" className="qr-rise text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
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

function PasswordFields({ hasPassword }: { hasPassword: boolean }) {
  const [removePassword, setRemovePassword] = useState(false);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Password (optional)</legend>
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
          autoComplete="new-password"
          placeholder={hasPassword ? "Leave blank to keep the current one" : "At least 4 characters"}
          disabled={removePassword}
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
    </fieldset>
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
