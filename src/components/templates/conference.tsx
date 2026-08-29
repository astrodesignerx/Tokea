import type { EventTemplateProps } from "./shared";
import { formatEventDateTime } from "@/lib/format";
import { RsvpButton } from "./shared";

export function Conference(props: EventTemplateProps) {
  const full = formatEventDateTime(props.startsAt, props.timezone);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-xs uppercase tracking-widest text-slate-500">Conference</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-2">{props.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{full}</p>
          {props.venueName && (
            <p className="text-sm text-slate-600">
              {props.venueName}
              {props.venueAddress ? `, ${props.venueAddress}` : ""}
            </p>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        {props.description && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">About</h2>
            <p className="text-base text-slate-700 whitespace-pre-line leading-relaxed">{props.description}</p>
          </section>
        )}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Schedule</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
            <ScheduleRow time="Doors open" detail="Registration & coffee" />
            <ScheduleRow time="Opening keynote" detail="Welcome and framing" />
            <ScheduleRow time="Sessions" detail="Three parallel tracks" />
            <ScheduleRow time="Closing" detail="Q&A and networking" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Detailed schedule shared with confirmed attendees closer to the date.
          </p>
        </section>
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Reserve your seat</h2>
          <RsvpButton href={props.rsvpHref} isPreview={props.isPreview} />
        </section>
      </div>
    </div>
  );
}

function ScheduleRow({ time, detail }: { time: string; detail: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-medium">{time}</div>
      <div className="text-sm text-slate-600">{detail}</div>
    </div>
  );
}
