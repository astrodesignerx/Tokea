"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, LogOut, X } from "lucide-react";
import { isNavItemActive, NAV_ITEMS } from "@/components/dashboard/nav-items";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.mobileLabel);
const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.mobileLabel);

export function MobileTabbar({ email }: { email: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isNavItemActive(item, pathname));

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMoreOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(62px+env(safe-area-inset-bottom))] grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {PRIMARY_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("nf-shell-control flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-[11px]", active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <span className={cn("nf-shell-control rounded-xl px-3.5 py-0.5", active && "bg-tint text-primary")}><Icon aria-hidden="true" className="size-5" /></span>
              {item.mobileLabel}
            </Link>
          );
        })}
        <Dialog.Trigger asChild>
          <button type="button" aria-label="More pages and account" className={cn("nf-shell-control flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-[11px]", moreActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <span className={cn("nf-shell-control rounded-xl px-3.5 py-0.5", moreActive && "bg-tint text-primary")}><Ellipsis aria-hidden="true" className="size-5" /></span>
            More
          </button>
        </Dialog.Trigger>
      </nav>
      <Dialog.Portal>
        <Dialog.Overlay className="nf-shell-scrim fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="nf-more-sheet fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-2xl border bg-card px-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-card-foreground shadow-2xl">
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-8 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">More</Dialog.Title>
            <Dialog.Close aria-label="Close more pages" className="nf-shell-control grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X aria-hidden="true" className="size-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">More pages, colour theme and account controls.</Dialog.Description>
          <nav aria-label="More pages">
            {MORE_ITEMS.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <Dialog.Close key={item.href} asChild>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("nf-shell-control flex h-12 items-center gap-3 rounded-md px-3 text-[13px]", active ? "bg-tint font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <Icon aria-hidden="true" className={cn("size-5", active && "text-primary")} />
                    {item.label}
                  </Link>
                </Dialog.Close>
              );
            })}
          </nav>
          <div className="mt-3 space-y-3 border-t pt-4">
            <p title={email} className="truncate px-3 text-xs text-muted-foreground">{email}</p>
            <div className="flex items-center justify-between gap-3 px-3"><span className="text-[13px]">Colour theme</span><ThemeToggle /></div>
            <form action={signOutAction}>
              <button type="submit" className="nf-shell-control flex h-12 w-full items-center gap-3 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut aria-hidden="true" className="size-5" />Sign out</button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
