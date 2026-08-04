import { format } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export function formatEventDateTime(input: Date, timezone: string): string {
  return formatInTimeZone(input, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

export function formatEventDate(input: Date, timezone: string): string {
  return formatInTimeZone(input, timezone, "MMMM d, yyyy");
}

export function formatEventTime(input: Date, timezone: string): string {
  return formatInTimeZone(input, timezone, "h:mm a");
}

export function formatLocalTimezoneOffset(input: Date, eventTimezone: string): string | null {
  if (eventTimezone === Intl.DateTimeFormat().resolvedOptions().timeZone) return null;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localZoned = toZonedTime(input, local);
  return format(localZoned, "h:mm a zzz");
}

export function shortDateTime(input: Date): string {
  return format(input, "MMM d, yyyy h:mm a");
}
