import type { Organisation } from "@/lib/cards/data";
import { cn } from "@/lib/utils";

/**
 * A plain img rather than next/image: logos are client uploads on arbitrary
 * hosts, and every one of those would otherwise need a remotePatterns entry.
 * Falls back to the organisation name so a card without a logo still reads.
 */
export function OrgLogo({
  org,
  className,
}: {
  org: Organisation;
  className?: string;
}) {
  if (!org.logo_url) {
    return (
      <span
        className={cn(
          "text-lg font-semibold tracking-tight text-[var(--brand-ink)]",
          className
        )}
      >
        {org.name}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={org.logo_url}
      alt={org.name}
      className={cn("w-auto object-contain", className)}
    />
  );
}
