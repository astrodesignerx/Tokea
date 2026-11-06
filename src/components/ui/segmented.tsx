"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label"?: string;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      className={cn("inline-flex items-center gap-0.5 rounded-[7px] bg-muted p-0.5", className)}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onValueChange(option.value);
            }}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-xs ring-offset-background transition-colors duration-[var(--dur-2)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              selected
                ? "bg-foreground text-background font-semibold"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span
                className={cn(
                  "nums tabular-nums text-[11px]",
                  selected ? "text-background/75" : "text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
