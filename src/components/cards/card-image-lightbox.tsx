"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type CardImageLightboxProps = {
  src: string;
  alt: string;
};

/**
 * A card-design image that opens full size in an overlay when tapped, the
 * same pattern as QrDialog: the overlay animates on opacity and transform
 * alone, and stays mounted so both transitions can play.
 */
export function CardImageLightbox({ src, alt }: CardImageLightboxProps) {
  const [open, setOpen] = useState(false);

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
        aria-label={`Zoom in: ${alt}`}
        className="block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-auto w-full rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)] active:scale-[0.99]"
        />
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={alt}
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
          className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--brand-ink)_60%,transparent)] backdrop-blur-[2px]"
        />

        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-lg bg-white/90 p-1.5 text-[var(--brand-ink)] shadow-md transition-colors duration-[var(--card-duration-fast)] hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            "max-h-[90dvh] w-auto max-w-full rounded-lg shadow-2xl",
            "transition-transform duration-[var(--card-duration-base)] ease-[var(--card-ease-out)]",
            open ? "translate-y-0 scale-100" : "translate-y-2 scale-95"
          )}
        />
      </div>
    </>
  );
}
