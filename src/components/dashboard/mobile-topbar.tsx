"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useCommandMenu } from "@/components/dashboard/command-menu";
import { CREATE_ACTIONS } from "@/components/dashboard/nav-items";
import { Wordmark } from "@/components/marketing/wordmark";
import { PRODUCT } from "@/lib/brand";

export function MobileTopbar() {
  const commandMenu = useCommandMenu();

  return (
    <header className="sticky top-0 z-40 flex h-[52px] shrink-0 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label={PRODUCT} className="nf-shell-control flex h-11 items-center rounded-md"><Wordmark /></Link>
      <div className="flex items-center">
        <button type="button" aria-label="Search pages and actions" onClick={commandMenu.open} className="nf-shell-control grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <Search aria-hidden="true" className="size-5" />
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" aria-label="New" className="nf-shell-control grid size-11 place-items-center rounded-md">
              <span className="grid size-8 place-items-center rounded-md bg-foreground text-background"><Plus aria-hidden="true" className="size-5" /></span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={8} className="nf-new-menu z-50 min-w-48 max-w-[calc(100vw-16px)] rounded-lg border bg-card p-1 text-card-foreground shadow-lg">
              {CREATE_ACTIONS.map(({ href, label, icon: Icon }) => (
                <DropdownMenu.Item key={href} asChild>
                  <Link href={href} className="nf-shell-control flex min-h-11 items-center gap-2 rounded-md px-2.5 text-[13px] outline-none data-[highlighted]:bg-muted">
                    <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                    {label}
                  </Link>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
