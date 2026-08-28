"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ShareActionsProps = {
  /** The short link, so anything shared from here survives a slug change. */
  url: string;
  name: string;
  title: string;
};

const OUTLINE_BUTTON = cn(
  "flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)]",
  "px-4 py-3 text-sm font-medium text-[var(--brand-ink)]",
  "transition-[background-color,border-color,transform] duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)]",
  "hover:border-[var(--brand-teal)] hover:bg-[color-mix(in_srgb,var(--brand-teal)_6%,transparent)]",
  "active:scale-[0.98]"
);

/**
 * Copy and native share. Both need the browser, so this is the only part of the
 * card that ships JavaScript — Save to Contacts is a plain download link.
 */
/** navigator.share is a fixed capability, so it never needs to notify a change. */
const subscribeNever = () => () => {};
const hasShareApi = () => typeof navigator !== "undefined" && !!navigator.share;

export function ShareActions({ url, name, title }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through useSyncExternalStore rather than an effect: the server
  // snapshot is false, so the button renders only after hydration and the
  // markup still matches, without a setState cascade on mount.
  const canShare = useSyncExternalStore(subscribeNever, hasShareApi, () => false);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: `${name} - ${title}`, url });
    } catch {
      // The user dismissed the sheet; nothing to recover from.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Link copied" : "Copy link to this card"}
        className={cn(OUTLINE_BUTTON, "flex-1")}
      >
        <span className="relative grid h-4 w-4 place-items-center">
          <Copy
            className={cn(
              "absolute h-4 w-4 transition-[opacity,transform] duration-[var(--card-duration-base)] ease-[var(--card-ease-out)]",
              copied ? "scale-75 opacity-0" : "scale-100 opacity-100"
            )}
          />
          <Check
            className={cn(
              "absolute h-4 w-4 text-[var(--brand-teal)] transition-[opacity,transform] duration-[var(--card-duration-base)] ease-[var(--card-ease-out)]",
              copied ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
          />
        </span>
        {copied ? "Copied" : "Copy link"}
      </button>

      {canShare && (
        <button
          type="button"
          onClick={share}
          aria-label="Share this card"
          className={OUTLINE_BUTTON}
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      )}
    </>
  );
}
