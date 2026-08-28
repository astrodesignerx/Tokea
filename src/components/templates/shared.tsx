import Image from "next/image";
import Link from "next/link";
import { formatEventDateTime, formatEventTime, formatLocalTimezoneOffset } from "@/lib/format";
import type { CoverMotion } from "@/lib/templates";
import { cn } from "@/lib/utils";

export type EventTemplateProps = {
  title: string;
  description: string | null;
  startsAt: Date;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  coverImageUrl: string | null;
  coverMotion?: CoverMotion;
  rsvpHref: string | null;
  isPreview?: boolean;
};

/**
 * The cover photo, with its entrance and optional ambient drift.
 *
 * The scale in both animations means the image overflows its box mid-motion,
 * so the parent must clip it — otherwise the page gains a horizontal scrollbar.
 */
export function CoverImage({
  url,
  motion = "none",
  className,
}: {
  url: string;
  motion?: CoverMotion;
  className?: string;
}) {
  return (
    <Image
      src={url}
      alt=""
      fill
      priority
      unoptimized
      className={cn("object-cover cover-plate", motion === "drift" && "cover-drift", className)}
    />
  );
}

export function formatDateLine(props: EventTemplateProps): { primary: string; secondary: string | null } {
  const primary = formatEventDateTime(props.startsAt, props.timezone);
  const local = formatLocalTimezoneOffset(props.startsAt, props.timezone);
  return { primary, secondary: local };
}

export function formatTimeOnly(props: EventTemplateProps): string {
  return formatEventTime(props.startsAt, props.timezone);
}

export function RsvpButton({ href, label = "RSVP", isPreview }: { href: string | null; label?: string; isPreview?: boolean }) {
  if (!href || isPreview) {
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-11 px-6 text-sm font-medium opacity-50 cursor-not-allowed">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-11 px-6 text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      {label}
    </Link>
  );
}
