"use client";

import { useState } from "react";
import type { DailyCount } from "@/lib/cards/analytics";

/**
 * Daily scan counts.
 *
 * One series, so there is no legend: the heading above names what is plotted,
 * and a legend box for a single thing is noise. Values are not printed on the
 * bars either; the hover tooltip carries the exact number, and the axis carries
 * the ceiling.
 *
 * Built from elements rather than SVG. The bars are a flex row of divs, which
 * keeps every edge on a device pixel at any width, where a scaled SVG viewBox
 * would blur them.
 */

const BAR_MIN = 2; // px, so a zero day is still visibly a day

function label(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ScanChart({ data }: { data: DailyCount[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const active = hover === null ? null : data[hover];

  return (
    <figure className="m-0">
      <div className="flex items-baseline justify-between">
        <figcaption className="text-sm text-muted-foreground">
          Scans per day, last {data.length} days
        </figcaption>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {total} total
        </span>
      </div>

      <div className="relative mt-4">
        {/* Recessive gridlines. The top line doubles as the axis maximum. */}
        <div aria-hidden="true" className="absolute inset-0">
          {[0, 0.5, 1].map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border/60"
              style={{ top: `${t * 100}%` }}
            />
          ))}
        </div>

        <div
          className="relative flex h-44 items-end gap-[2px]"
          onPointerLeave={() => setHover(null)}
        >
          {data.map((d, i) => (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 cursor-default items-end"
              onPointerEnter={() => setHover(i)}
            >
              {/* Full-height hit target, so thin bars are still easy to hover. */}
              <div
                className="absolute inset-0 rounded-sm transition-colors duration-150"
                style={{
                  backgroundColor:
                    hover === i ? "hsl(var(--brand) / 0.08)" : "transparent",
                }}
              />
              <div
                className="relative w-full rounded-t-[4px] transition-[background-color] duration-150"
                style={{
                  height: `max(${BAR_MIN}px, ${(d.count / max) * 100}%)`,
                  backgroundColor:
                    d.count === 0
                      ? "hsl(var(--border))"
                      : hover === i
                        ? "hsl(var(--brand))"
                        : "hsl(var(--brand) / 0.55)",
                }}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute -top-1 right-0 font-mono text-[0.625rem] text-muted-foreground tabular-nums">
          {max}
        </div>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[0.625rem] text-muted-foreground">
        <span>{label(data[0]?.date ?? "")}</span>
        <span>{label(data[data.length - 1]?.date ?? "")}</span>
      </div>

      {/*
        Reserved height, so the layout does not shift as the pointer moves
        across the bars.
      */}
      <p className="mt-3 h-5 text-sm" aria-live="polite">
        {active ? (
          <span className="text-foreground">
            <span className="font-medium tabular-nums">{active.count}</span>{" "}
            {active.count === 1 ? "scan" : "scans"}{" "}
            <span className="text-muted-foreground">on {label(active.date)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Hover a bar for that day&rsquo;s count.
          </span>
        )}
      </p>
    </figure>
  );
}
