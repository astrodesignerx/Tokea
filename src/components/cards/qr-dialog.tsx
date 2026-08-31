"use client";

import { useEffect, useState } from "react";
import { QrCode, X } from "lucide-react";
import { cn } from "@/lib/utils";

type QrDialogProps = {
  /** Pre-rendered on the server so opening the dialog costs no network round trip. */
  dataUrl: string;
  name: string;
  /** The same QR tinted with a scannable brand colour, when the org has one. */
  brandDataUrl?: string;
};

/**
 * Shown as an overlay rather than an inline expander: an overlay animates on
 * opacity and transform alone, where an inline panel would push the page around.
 */
export function QrDialog({ dataUrl, name, brandDataUrl }: QrDialogProps) {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<"neutral" | "brand">("neutral");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the overlay from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-3",
          "text-sm font-medium text-[var(--brand-ink)]",
          "transition-[background-color,border-color,transform] duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)]",
          "hover:border-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)]",
          "active:scale-[0.98]"
        )}
      >
        <QrCode className="h-4 w-4" />
        QR code
      </button>

      {/* Kept mounted so both the open and close transitions can play. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for ${name}`}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-50 grid place-items-center p-6",
          "transition-[opacity,visibility] duration-[var(--card-duration-base)] ease-[var(--card-ease-out)]",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--brand-ink)_45%,transparent)] backdrop-blur-[2px]"
        />

        <div
          className={cn(
            "relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl",
            "transition-transform duration-[var(--card-duration-base)] ease-[var(--card-ease-out)]",
            open ? "translate-y-0 scale-100" : "translate-y-2 scale-95"
          )}
        >
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1 text-[var(--brand-ink-soft)] transition-colors duration-[var(--card-duration-fast)] hover:text-[var(--brand-ink)]"
          >
            <X className="h-4 w-4" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={variant === "brand" && brandDataUrl ? brandDataUrl : dataUrl}
            alt={`QR code linking to the digital card for ${name}`}
            className="mx-auto h-auto w-full max-w-[220px] rounded-xl"
          />
          <p className="mt-3 text-sm text-[var(--brand-ink-soft)]">
            Scan to open this card
          </p>

          {brandDataUrl && brandDataUrl !== dataUrl && (
            <div className="mt-4 flex gap-1 rounded-lg border border-[var(--card-border)] p-1">
              {(["neutral", "brand"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  aria-pressed={variant === v}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--card-duration-fast)]",
                    variant === v
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--brand-ink)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                  )}
                >
                  {v === "neutral" ? "Neutral" : "Brand"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
