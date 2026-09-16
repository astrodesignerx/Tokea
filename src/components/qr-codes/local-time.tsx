"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";

/**
 * Dates are stored in UTC but people think in their own time zone. These
 * helpers do the conversion in the browser, which is the only place that knows
 * the viewer's zone. The server render shows UTC, then the browser swaps in
 * local time once it has hydrated.
 */

const FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

const noopSubscribe = () => () => {};

/** False during the server render and hydration, true afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** Shows an ISO timestamp in the viewer's time zone. */
export function LocalTime({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  const date = new Date(iso);
  return (
    <time dateTime={iso}>
      {hydrated
        ? date.toLocaleString(undefined, FORMAT)
        : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`}
    </time>
  );
}

/** "2026-09-16T14:30" in local time, the shape a datetime-local input wants. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * A datetime-local picker that submits a UTC ISO string under `name`, so the
 * server never has to guess which zone the picked time was in.
 */
export function LocalDateTimeInput({
  name,
  defaultIso,
  id,
  required,
}: {
  name: string;
  defaultIso?: string | null;
  id?: string;
  required?: boolean;
}) {
  const hydrated = useHydrated();
  // null until the person edits the field; until then the saved value shows.
  const [edited, setEdited] = useState<string | null>(null);
  const local = edited ?? (hydrated && defaultIso ? toLocalInput(defaultIso) : "");
  const iso = local ? new Date(local).toISOString() : "";

  return (
    <>
      <Input
        id={id}
        type="datetime-local"
        value={local}
        onChange={(e) => setEdited(e.target.value)}
        required={required}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
