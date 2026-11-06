import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-8 max-md:h-11 w-full rounded-md border border-input bg-background px-2.5 py-1 text-[13px] max-md:text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-[var(--dur-1)] ease-[var(--ease-out)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
