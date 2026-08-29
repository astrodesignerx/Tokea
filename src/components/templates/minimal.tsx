import type { EventTemplateProps } from "./shared";
import { formatDateLine, RsvpButton } from "./shared";

export function Minimal(props: EventTemplateProps) {
  const { primary, secondary } = formatDateLine(props);
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full space-y-12">
        <div className="text-xs uppercase tracking-widest text-stone-500">You&apos;re invited</div>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight">{props.title}</h1>
        <div className="space-y-2 border-t border-b border-stone-200 py-8">
          <p className="text-base">{primary}</p>
          {secondary && <p className="text-sm text-stone-500">Local time: {secondary}</p>}
          {props.venueName && (
            <p className="text-sm text-stone-600">
              {props.venueName}
              {props.venueAddress ? `, ${props.venueAddress}` : ""}
            </p>
          )}
        </div>
        {props.description && (
          <p className="text-base text-stone-600 leading-relaxed whitespace-pre-line">{props.description}</p>
        )}
        <div>
          <RsvpButton href={props.rsvpHref} isPreview={props.isPreview} />
        </div>
      </div>
    </div>
  );
}
