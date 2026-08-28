"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const index = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === theme),
  );

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="relative inline-flex items-center rounded-md border bg-background p-0.5"
    >
      {/* Selection slides between options rather than blinking from one to the
          next. Transform only, so it composites. */}
      <span
        aria-hidden
        className="absolute left-0.5 top-0.5 size-7 rounded-sm bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={selected}
            title={label}
            className={cn(
              "relative z-10 grid size-7 place-items-center rounded-sm",
              "transition-colors duration-150 ease-out motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
