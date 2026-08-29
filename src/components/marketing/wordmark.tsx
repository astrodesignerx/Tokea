import { cn } from "@/lib/utils";
import { PRODUCT } from "@/lib/brand";

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

/** Mark plus wordmark. The site always spells the name out; only the favicon is the mark alone. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <NFMark className="size-5 text-brand" />
      <span className="font-display text-[0.9375rem] font-semibold tracking-tight">
        {PRODUCT}
      </span>
    </span>
  );
}
