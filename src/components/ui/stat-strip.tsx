import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatStripItem {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "default" | "positive";
}

export interface StatStripProps extends React.HTMLAttributes<HTMLDivElement> {
  items: readonly StatStripItem[];
}

export function StatStrip({ items, className, ...props }: StatStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-panel border bg-border",
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex flex-col gap-0.5 bg-card px-3.5 py-3"
        >
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="nums tabular-nums text-[26px] leading-tight font-bold tracking-[-0.035em] text-card-foreground">
            {item.value}
          </span>
          {item.note !== undefined && item.note !== null ? (
            <span
              className={cn(
                "text-[11px]",
                item.tone === "positive" ? "text-success" : "text-muted-foreground",
              )}
            >
              {item.note}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
