"use client";

import { Fragment, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { useCommandMenu } from "@/components/dashboard/command-menu";
import { isNavItemActive, NAV_ITEMS } from "@/components/dashboard/nav-items";
import { NFMark } from "@/components/marketing/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/lib/actions/auth";
import { PRODUCT, WORDMARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const serverIsMac = () => false;

export function AppSidebar({
  user,
  counts,
}: {
  user: { name: string | null; email: string };
  counts: { cards: number; qrCodes: number };
}) {
  const pathname = usePathname();
  const commandMenu = useCommandMenu();
  const mac = useSyncExternalStore(subscribe, isMac, serverIsMac);
  const parts = (user.name?.trim() || user.email.split("@")[0]).split(/[\s._-]+/).filter(Boolean);
  const initials = (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) || "NF").toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[208px] shrink-0 flex-col gap-3 bg-sidebar px-2.5 py-3.5 text-sidebar-foreground md:flex">
      <Link href="/" aria-label={PRODUCT} className="nf-shell-control flex h-[30px] shrink-0 items-center gap-2 rounded-md px-2">
        <NFMark className="size-5 text-sidebar-primary" />
        <span aria-hidden="true" className="font-display text-[15px] font-bold tracking-tight">{WORDMARK}<span className="text-sidebar-primary">!</span></span>
      </Link>
      <button type="button" onClick={commandMenu.open} className="nf-shell-control flex h-[30px] shrink-0 items-center gap-2 rounded-md border border-sidebar-border bg-background/5 px-2 text-[13px] text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground">
        <Search aria-hidden="true" className="size-4" />
        Search
        <kbd className="ml-auto font-mono text-[10px]">{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item, index) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Fragment key={item.href}>
              {item.group && item.group !== NAV_ITEMS[index - 1]?.group && (
                <p className="px-2 pb-1 pt-3.5 text-[11px] text-sidebar-muted">{item.group}</p>
              )}
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("nf-shell-control flex h-[30px] items-center gap-2 rounded-md px-2 text-[13px]", active ? "bg-sidebar-active font-medium text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground")}>
                <Icon aria-hidden="true" className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                {item.label}
                {item.countKey && <span className="ml-auto font-mono text-[11px] tabular-nums text-sidebar-muted">{counts[item.countKey].toLocaleString("en-GB")}</span>}
              </Link>
            </Fragment>
          );
        })}
      </nav>
      <div className="mt-auto shrink-0 space-y-3 border-t border-sidebar-border px-1 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="grid size-[26px] shrink-0 place-items-center rounded-md bg-sidebar-active text-[10px] font-medium">{initials}</span>
          <span title={user.email} className="truncate text-xs text-sidebar-muted">{user.email}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle tone="sidebar" />
          <form action={signOutAction}>
            <button type="submit" aria-label="Sign out" className="nf-shell-control grid size-8 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground">
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
