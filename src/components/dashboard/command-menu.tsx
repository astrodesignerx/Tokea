"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CREATE_ACTIONS, NAV_ITEMS } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";

const CommandMenuContext = createContext<{ open: () => void } | null>(null);

export function useCommandMenu() {
  const context = useContext(CommandMenuContext);
  if (!context) throw new Error("useCommandMenu requires CommandMenuProvider");
  return context;
}

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const listId = useId();
  const open = useCallback(() => {
    if (document.activeElement instanceof HTMLElement && !contentRef.current?.contains(document.activeElement)) {
      openerRef.current = document.activeElement;
    }
    setQuery("");
    setHighlighted(0);
    setIsOpen(true);
  }, []);
  const context = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target !== inputRef.current &&
        (target.closest("input, textarea, select") || target.isContentEditable)
      ) return;
      event.preventDefault();
      open();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const filter = query.trim().toLowerCase();
  const groups = [
    { label: "Pages", items: NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(filter)) },
    { label: "Create", items: CREATE_ACTIONS.filter((item) => item.label.toLowerCase().includes(filter)) },
  ];
  const results = groups.flatMap((group) => group.items);
  const selected = results[highlighted];

  useEffect(() => {
    if (isOpen && selected) {
      document.getElementById(`${listId}-option-${highlighted}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, highlighted, listId, selected]);

  function navigate(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  return (
    <CommandMenuContext.Provider value={context}>
      {children}
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="nf-shell-scrim fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            ref={contentRef}
            className="nf-command-content fixed inset-x-4 top-[18dvh] z-50 mx-auto w-auto max-w-[520px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (openerRef.current?.isConnected) openerRef.current.focus();
            }}
          >
            <Dialog.Title className="sr-only">Jump to a page or action</Dialog.Title>
            <Dialog.Description className="sr-only">
              Type to filter, use the arrow keys to choose, and press Enter to open.
            </Dialog.Description>
            <div className="flex h-11 items-center gap-2 border-b pl-3">
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    if (results.length) {
                      const direction = event.key === "ArrowDown" ? 1 : -1;
                      setHighlighted((index) => (index + direction + results.length) % results.length);
                    }
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (selected) navigate(selected.href);
                  }
                }}
                role="combobox"
                aria-label="Jump to a page or action"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={selected ? `${listId}-option-${highlighted}` : undefined}
                placeholder="Jump to a page or action"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm placeholder:text-muted-foreground"
              />
              <Dialog.Close aria-label="Close search" className="nf-shell-control grid size-11 shrink-0 place-items-center text-muted-foreground hover:text-foreground">
                <X aria-hidden="true" className="size-4" />
              </Dialog.Close>
            </div>
            <div id={listId} role="listbox" aria-label="Pages and create actions" className="max-h-[60dvh] overflow-y-auto overscroll-contain p-1.5">
              {groups.map((group, groupIndex) => {
                const offset = groupIndex === 0 ? 0 : groups[0].items.length;
                return group.items.length > 0 && (
                  <div key={group.label} role="group" aria-labelledby={`${listId}-${group.label}`}>
                    <div id={`${listId}-${group.label}`} className="px-2 py-2 text-[11px] font-medium text-muted-foreground">{group.label}</div>
                    {group.items.map(({ label, href, icon: Icon }, index) => (
                      <button
                        key={href}
                        id={`${listId}-option-${offset + index}`}
                        type="button"
                        role="option"
                        aria-selected={highlighted === offset + index}
                        tabIndex={-1}
                        onPointerMove={() => setHighlighted(offset + index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigate(href)}
                        className={cn("nf-shell-control flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]", highlighted === offset + index && "bg-muted")}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        {label}
                      </button>
                    ))}
                  </div>
                );
              })}
              {results.length === 0 && <p role="status" className="px-2 py-6 text-center text-sm text-muted-foreground">No matching pages or actions.</p>}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </CommandMenuContext.Provider>
  );
}
