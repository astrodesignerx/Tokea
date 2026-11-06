"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getTodoUnseenCountAction } from "@/lib/actions/todo";
import { cn } from "@/lib/utils";

/**
 * Feature tabs in the dashboard header.
 *
 * The underline sits on the link rather than being a single sliding element:
 * a shared indicator would need to measure positions on every route change,
 * and this reads the same for a handful of tabs.
 *
 * Every other route lives beneath /dashboard, so the hub tab must test for an
 * exact match. A prefix test would leave it lit on every page.
 */
const TABS = [
  { href: "/dashboard", label: "Services", exact: true },
  { href: "/dashboard/companies", label: "Cards", exact: false },
  { href: "/dashboard/qr", label: "QR codes", exact: false },
  { href: "/dashboard/forms", label: "Forms", exact: false },
  { href: "/dashboard/todo", label: "To-do", exact: false },
  { href: "/dashboard/checklists", label: "Checklists", exact: false },
  { href: "/dashboard/events", label: "Events", exact: false },
  { href: "/dashboard/analytics", label: "Analytics", exact: false },
];

export function DashNav() {
  const pathname = usePathname();
  const [todoCount, setTodoCount] = useState(0);
  useEffect(() => {
    let active = true;
    getTodoUnseenCountAction().then((count) => { if (active) setTodoCount(count); }).catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  return (
    <nav
      className={cn(
        // Full header height so the underline sits inside the scroll area instead of being clipped by it.
        "flex h-full min-w-0 items-stretch gap-1 overflow-x-auto whitespace-nowrap",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center rounded-md px-2.5 text-sm transition-colors duration-200",
              "after:absolute after:inset-x-2.5 after:bottom-0 after:h-px",
              "after:origin-left after:scale-x-0 after:bg-brand",
              "after:transition-transform after:duration-200 after:ease-[cubic-bezier(0,0,0.2,1)]",
              active
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {href === "/dashboard/todo" && todoCount > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground" aria-label={`${todoCount} unread requests`}>{todoCount}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
