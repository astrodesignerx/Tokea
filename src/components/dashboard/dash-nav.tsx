"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Feature tabs in the dashboard header.
 *
 * The underline sits on the link rather than being a single sliding element:
 * a shared indicator would need to measure positions on every route change,
 * and this reads the same for two or three tabs.
 *
 * Cards live under /dashboard/companies, so the events tab has to test for an
 * exact match. Testing a prefix would light both tabs on the cards routes.
 */
const TABS = [
  { href: "/dashboard", label: "Events", exact: true },
  { href: "/dashboard/companies", label: "Cards", exact: false },
];

export function DashNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200",
              "after:absolute after:inset-x-2.5 after:-bottom-[0.9rem] after:h-px",
              "after:origin-left after:scale-x-0 after:bg-brand",
              "after:transition-transform after:duration-200 after:ease-[cubic-bezier(0,0,0.2,1)]",
              active
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
