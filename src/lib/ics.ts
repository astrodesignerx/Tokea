import { formatInTimeZone } from "date-fns-tz";

function toIcsDate(input: Date, timezone: string): string {
  const yyyy = formatInTimeZone(input, timezone, "yyyy");
  const mm = formatInTimeZone(input, timezone, "MM");
  const dd = formatInTimeZone(input, timezone, "dd");
  const hh = formatInTimeZone(input, timezone, "HH");
  const mi = formatInTimeZone(input, timezone, "mm");
  const ss = formatInTimeZone(input, timezone, "ss");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}`;
}

function escapeIcs(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(input: {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  url: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tokea//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@tokea.app`,
    `DTSTAMP:${toIcsDate(new Date(), "UTC")}Z`,
    `DTSTART;TZID=${input.timezone}:${toIcsDate(input.startsAt, input.timezone)}`,
    `DTEND;TZID=${input.timezone}:${toIcsDate(input.endsAt, input.timezone)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    input.description ? `DESCRIPTION:${escapeIcs(input.description)}` : null,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : null,
    `URL:${input.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return lines.join("\r\n");
}
