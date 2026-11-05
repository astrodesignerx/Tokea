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

export function ThemeToggle({ tone = "default" }: { tone?: "default" | "sidebar" }) {
  const { theme, setTheme } = useTheme();
  const index = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === theme),
  );

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "relative inline-flex items-center rounded-md border p-0.5",
        tone === "sidebar" ? "border-sidebar-border bg-transparent" : "bg-background",
      )}
    >
      {/* Selection slides between options rather than blinking from one to the
          next. Transform only, so it composites. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 top-0.5 size-7 rounded-sm transition-transform motion-reduce:transition-none",
          tone === "sidebar"
            ? "bg-sidebar-active duration-[var(--dur-2)] ease-[var(--ease-out)]"
            : "bg-accent duration-200 ease-out",
        )}
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
              "transition-colors motion-reduce:transition-none",
              tone === "sidebar"
                ? "duration-[var(--dur-1)] ease-[var(--ease-out)]"
                : "duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tone === "sidebar"
                ? selected ? "text-sidebar-foreground" : "text-sidebar-muted hover:text-sidebar-foreground"
                : selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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
