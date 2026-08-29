import { cn } from "@/lib/utils";
import { PRODUCT, WORDMARK } from "@/lib/brand";

/**
 * The NF mark, drawn as inline SVG so it inherits currentColor and stays
 * crisp. Same geometry as app/icon.svg, minus the green plate: on a page the
 * mark sits directly on the background, while a favicon needs its own field
 * to survive whatever browser chrome is behind it.
 */
export function NFMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-5", className)}
      fill="currentColor"
    >
      <rect x="7" y="9" width="3" height="14" />
      <path d="M7 9 L10 9 L18 23 L15 23 Z" />
      <rect x="15" y="9" width="3" height="14" />
      <rect x="18" y="9" width="7" height="3" />
      <rect x="18" y="14.5" width="5" height="3" />
    </svg>
  );
}

/**
 * Mark plus logotype. Set in Manrope at its heaviest weight, uppercase and
 * tightly tracked, so it reads as a logo rather than as a heading that happens
 * to be the name.
 *
 * The exclamation mark carries the accent while the letters stay in text
 * colour. Colouring the whole word would put the wordmark in competition with
 * every other green thing on the page; one glyph is enough to make it a mark.
 *
 * aria-label restores the ordinary spelling, so a screen reader says
 * "NikoForm" rather than shouting an acronym.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-label={PRODUCT}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <NFMark className="size-5 text-brand" />
      <span
        aria-hidden="true"
        className="font-display text-[0.9375rem] font-extrabold tracking-[-0.01em]"
      >
        {WORDMARK}
        <span className="text-brand">!</span>
      </span>
    </span>
  );
}
