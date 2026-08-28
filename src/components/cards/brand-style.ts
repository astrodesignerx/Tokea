import type { CSSProperties } from "react";
import type { Organisation } from "@/lib/cards/data";

/**
 * Turns an organisation's stored palette into the custom properties the card
 * styles read. Set this on the outermost element of anything showing that
 * organisation's branding; cards.css holds the same names as defaults, so a
 * component still renders sensibly without it.
 */
export function brandStyle(org: Organisation): CSSProperties {
  return {
    "--brand-primary": org.brand_primary,
    "--brand-secondary": org.brand_secondary,
    "--brand-accent": org.brand_accent,
    "--brand-ink": org.brand_ink,
  } as CSSProperties;
}
