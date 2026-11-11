"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deletePage, renamePage, setPageBadge, setPageLive } from "@/lib/actions/pages";

export function PageControls({ id, title, live, badge }: { id: string; title: string; live: boolean; badge: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function save(action: () => Promise<{ error: string | null }>, deleting = false) {
    setError("");
    start(async () => {
      try {
        const result = await action();
        if (result.error) { setError(result.error); return; }
        if (deleting) { setConfirm(false); router.push("/dashboard/pages"); }
        router.refresh();
      } catch { setError("Could not save this change. Please try again."); }
    });
  }

  return <div className="mt-5 border-t pt-2" aria-busy={pending}>
    <Toggle label="Link is live" hint="Turn off to hide it without deleting." checked={live} disabled={pending} onChange={() => save(() => setPageLive(id, !live))} />
    <Toggle label="Show NikoForm pill" hint="Small corner badge the client can close." checked={badge} disabled={pending} onChange={() => save(() => setPageBadge(id, !badge))} />
    <form className="mt-5" onSubmit={(event) => { event.preventDefault(); save(() => renamePage(id, name)); }}>
      <label htmlFor="page-title" className="text-sm font-medium">Page title</label>
      <div className="mt-2 flex min-w-0 gap-2"><Input id="page-title" value={name} required maxLength={120} disabled={pending} onChange={(event) => setName(event.target.value)} /><Button type="submit" variant="outline" disabled={pending || name.trim() === title}>Rename</Button></div>
    </form>
    <Dialog.Root open={confirm} onOpenChange={(open) => { if (!pending) setConfirm(open); }}>
      <Dialog.Trigger asChild><Button type="button" variant="ghost" className="mt-5 text-destructive" disabled={pending}><Trash2 className="size-4" />Delete page</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="pages-dialog-overlay fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="pages-ui pages-dialog-content fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium">Delete this page?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">The file will be removed and the client link will stop working. This cannot be undone.</Dialog.Description>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex justify-end gap-2"><Dialog.Close asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></Dialog.Close><Button type="button" variant="destructive" disabled={pending} onClick={() => save(() => deletePage(id), true)}>{pending ? "Deleting..." : "Delete page"}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {error && !confirm && <p role="alert" className="pages-enter mt-3 text-sm text-destructive">{error}</p>}
  </div>;
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b py-3">
    <div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange} className={`pages-switch relative h-7 w-12 shrink-0 rounded-full ${checked ? "bg-primary" : "bg-muted"}`}><span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm" style={{ transform: `translateX(${checked ? 20 : 0}px)` }} /></button>
  </div>;
}
