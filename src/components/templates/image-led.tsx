import type { EventTemplateProps } from "./shared";
import { CoverImage, formatDateLine, RsvpButton } from "./shared";

export function ImageLed(props: EventTemplateProps) {
  const { primary, secondary } = formatDateLine(props);
  return (
    <div className="min-h-screen relative flex flex-col">
      {props.coverImageUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <CoverImage url={props.coverImageUrl} motion={props.coverMotion} />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      {!props.coverImageUrl && <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-900 to-zinc-700" />}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center text-white px-6 py-20">
        <div className="max-w-2xl space-y-6 cover-caption">
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight">{props.title}</h1>
          <div className="space-y-1">
            <p className="text-lg sm:text-xl">{primary}</p>
            {secondary && <p className="text-sm text-white/70">{secondary}</p>}
          </div>
          {props.venueName && (
            <p className="text-base text-white/80">
              {props.venueName}
              {props.venueAddress ? ` · ${props.venueAddress}` : ""}
            </p>
          )}
          {props.description && <p className="text-base text-white/85 max-w-xl mx-auto whitespace-pre-line">{props.description}</p>}
          <div className="pt-4">
            <RsvpButton href={props.rsvpHref} isPreview={props.isPreview} />
          </div>
        </div>
      </div>
    </div>
  );
}
