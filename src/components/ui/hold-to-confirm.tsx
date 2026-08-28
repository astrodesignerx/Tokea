"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** How much faster the fill drains than it filled. */
const REWIND_RATE = 2.2;

type Props = {
  /**
   * Action text. Name the thing being acted on — "Hold to delete event", not
   * "Hold to delete" — so the label reads unambiguously on its own.
   */
  label: string;
  icon?: React.ReactNode;
  /** Runs once the hold completes. A server action is fine. */
  onConfirm: () => Promise<void> | void;
  holdMs?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * A button that only fires after a deliberate press-and-hold, with black liquid
 * filling left to right as confirmation of progress.
 *
 * The hold guards against misclicks; it is not a security boundary. Whatever
 * `onConfirm` calls must still authorise on the server.
 *
 * Driven by the Web Animations API rather than CSS keyframes: releasing early
 * has to drain from wherever the fill reached, and `playbackRate = -2.2` does
 * that in a line where CSS cannot reverse cleanly from an arbitrary midpoint.
 *
 * The animations are built on first press rather than in an effect, so nothing
 * shared is mutated across a render boundary. They are attached to nodes inside
 * this button, so unmounting the button collects them.
 */
export function HoldToConfirm({
  label,
  icon,
  onConfirm,
  holdMs = 1000,
  disabled,
  className,
}: Props) {
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const revealRef = React.useRef<HTMLSpanElement>(null);
  const animsRef = React.useRef<Animation[] | null>(null);
  const committedRef = React.useRef(false);
  const [working, setWorking] = React.useState(false);

  function animations(): Animation[] | null {
    if (animsRef.current) return animsRef.current;
    const fill = fillRef.current;
    const reveal = revealRef.current;
    if (!fill || !reveal) return null;

    const timing: KeyframeAnimationOptions = { duration: holdMs, easing: "linear", fill: "both" };
    const slide = fill.animate(
      [{ transform: "translateX(-104%)" }, { transform: "translateX(0)" }],
      timing,
    );
    // The light copy of the label is uncovered exactly in step with the liquid,
    // so the text stays readable the whole way across.
    const wipe = reveal.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      timing,
    );
    slide.pause();
    wipe.pause();
    slide.currentTime = 0;
    wipe.currentTime = 0;

    animsRef.current = [slide, wipe];
    return animsRef.current;
  }

  function rewindToStart(anims: Animation[]) {
    for (const a of anims) {
      a.playbackRate = 1;
      a.currentTime = 0;
      a.pause();
    }
  }

  function begin() {
    if (disabled || working || committedRef.current) return;
    const anims = animations();
    if (!anims) return;
    const [slide] = anims;

    // Re-bound every press so the handler always closes over the current
    // onConfirm rather than whichever one existed when the button mounted.
    slide.onfinish = () => {
      if (slide.playbackRate < 0) {
        rewindToStart(anims);
        return;
      }
      if (committedRef.current) return;
      committedRef.current = true;
      setWorking(true);

      void (async () => {
        try {
          await onConfirm();
        } catch (err) {
          // A server action that redirects rejects with this; not a failure.
          const message = err instanceof Error ? err.message : "Something went wrong";
          if (message.includes("NEXT_REDIRECT")) return;
          toast.error(message);
          committedRef.current = false;
          setWorking(false);
          rewindToStart(anims);
        }
      })();
    };

    for (const a of anims) {
      a.playbackRate = 1;
      a.play();
    }
  }

  function release() {
    if (committedRef.current || working) return;
    const anims = animsRef.current;
    if (!anims) return;
    const [slide] = anims;
    if (slide.playbackRate < 0) return; // already draining

    // Releasing must always stop the fill. Bailing out early here without
    // pausing would leave it running to completion, and the action would fire
    // from what the user experienced as an ordinary click.
    const elapsed = slide.currentTime;
    if (typeof elapsed !== "number" || elapsed <= 0) {
      rewindToStart(anims);
      return;
    }

    for (const a of anims) {
      a.playbackRate = -REWIND_RATE;
      a.play();
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${label}. Press and hold to confirm.`}
      className={cn(
        "relative isolate w-full h-9 overflow-hidden rounded-md select-none",
        "text-sm font-medium text-destructive",
        "transition-colors hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "[touch-action:none]",
        className,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        begin();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onKeyDown={(e) => {
        if (e.key !== " " && e.key !== "Enter") return;
        e.preventDefault();
        if (!e.repeat) begin();
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onBlur={release}
      // A hold control must never also fire from a plain click.
      onClick={(e) => e.preventDefault()}
    >
      <span aria-hidden className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <span ref={fillRef} className="htc-fill" />
      </span>

      <span className="relative z-10 flex h-full items-center justify-start gap-2 px-3 pointer-events-none">
        {icon}
        {label}
      </span>

      <span
        ref={revealRef}
        aria-hidden
        className="htc-reveal absolute inset-0 z-20 flex h-full items-center justify-start gap-2 px-3 pointer-events-none"
      >
        {icon}
        {label}
      </span>

      <span role="status" aria-live="polite" className="sr-only">
        {working ? `${label} in progress` : ""}
      </span>
    </button>
  );
}
