import type { EventTemplateProps } from "./shared";
import { formatEventTime, formatEventDate } from "@/lib/format";
import { RsvpButton } from "./shared";

export function Birthday(props: EventTemplateProps) {
  const day = new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: props.timezone }).format(props.startsAt);
  const monthYear = formatEventDate(props.startsAt, props.timezone);
  const time = formatEventTime(props.startsAt, props.timezone);
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-300 via-amber-200 to-sky-300 flex items-center justify-center px-6 py-20">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="text-6xl">🎉</div>
        <p className="text-sm uppercase tracking-widest text-pink-900/70">It&apos;s a celebration</p>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-pink-900">{props.title}</h1>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto bg-white/40 backdrop-blur rounded-2xl p-6">
          <div>
            <div className="text-6xl font-bold text-pink-900 leading-none">{day}</div>
            <div className="text-xs uppercase tracking-widest text-pink-900/70 mt-1">{monthYear}</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-3xl">⏰</div>
            <div className="text-sm font-medium text-pink-900 mt-1">{time}</div>
          </div>
        </div>
        {props.venueName && (
          <div className="text-base text-pink-900/80">
            <p className="font-medium">{props.venueName}</p>
            {props.venueAddress && <p className="text-sm">{props.venueAddress}</p>}
          </div>
        )}
        {props.description && <p className="text-base text-pink-900/80 whitespace-pre-line">{props.description}</p>}
        <div className="pt-2">
          <RsvpButton href={props.rsvpHref} isPreview={props.isPreview} />
        </div>
      </div>
    </div>
  );
}
