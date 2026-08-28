import { cn } from "@/lib/utils";

/**
 * The three-triangle corner motif from the printed Energy 4 Impact card.
 * Coordinates are lifted straight out of the source PDF (a 240 x 155pt page)
 * and cropped to the motif, so the angles match the print exactly.
 * Paint order matters: pale teal sits behind, then teal, then coral on top.
 */
export function BrandCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 99 155"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
      focusable="false"
      className={cn("select-none", className)}
    >
      <path d="M0 155 L96.87 155 L0 81.04 Z" fill="var(--brand-secondary)" />
      <path d="M0 0 L0 128.5 L98.8 0 Z" fill="var(--brand-primary)" />
      <path d="M0 155 L68.25 155 L0 102.89 Z" fill="var(--brand-accent)" />
    </svg>
  );
}
