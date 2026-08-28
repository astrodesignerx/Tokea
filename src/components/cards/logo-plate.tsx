import { cn } from "@/lib/utils";

/**
 * Client logos on a fixed white plate.
 *
 * Logos arrive as arbitrary uploads, and most are dark artwork on transparency,
 * which disappears against the dashboard's dark theme. A plate is the only
 * treatment that holds for every logo, since we cannot know in advance whether
 * a given one is light or dark. Public card pages are always light and do not
 * need this.
 */
export function LogoPlate({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  if (!src) {
    return (
      <span className={cn("text-base font-semibold tracking-tight", className)}>
        {name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-black/5 bg-white px-2 py-1",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="h-full w-auto object-contain" />
    </span>
  );
}
