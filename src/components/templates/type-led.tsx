import type { EventTemplateProps } from "./shared";
import { CoverImage, formatDateLine, RsvpButton } from "./shared";

export function TypeLed(props: EventTemplateProps) {
  const { primary, secondary } = formatDateLine(props);
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-16 order-2 md:order-1">
        <div className="max-w-md space-y-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">You&apos;re invited</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">{props.title}</h1>
          <div className="space-y-1 text-sm">
            <p>{primary}</p>
            {secondary && <p className="text-muted-foreground">{secondary}</p>}
          </div>
          {props.venueName && (
            <div className="text-sm">
              <p className="font-medium">{props.venueName}</p>
              {props.venueAddress && <p className="text-muted-foreground">{props.venueAddress}</p>}
            </div>
          )}
          {props.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{props.description}</p>
          )}
          <div>
            <RsvpButton href={props.rsvpHref} isPreview={props.isPreview} />
          </div>
        </div>
      </div>
      <div className="relative min-h-[300px] md:min-h-screen order-1 md:order-2 bg-muted overflow-hidden">
        {props.coverImageUrl ? (
          <CoverImage url={props.coverImageUrl} motion={props.coverMotion} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-400" />
        )}
      </div>
    </div>
  );
}
