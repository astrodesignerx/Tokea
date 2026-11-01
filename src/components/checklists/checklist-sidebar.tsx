"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import { createChecklistAction } from "@/lib/actions/checklists";
import type { SidebarList } from "@/lib/checklists/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PATH = "/dashboard/checklists";

export function ChecklistSidebar({ lists, taskCount }: { lists: SidebarList[]; taskCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams();
  const [archived, setArchived] = useState(false);
  const [state, action, pending] = useActionState(createChecklistAction, { error: null });
  const showForm = query.get("new") === "1";
  const rows = lists.filter((list) => archived || !list.archived);
  const groups = [
    { label: "Personal", rows: rows.filter((list) => !list.team && !list.archived) },
    { label: "Team", rows: rows.filter((list) => list.team && !list.archived) },
    ...(archived ? [{ label: "Archived", rows: rows.filter((list) => list.archived) }] : []),
  ];

  return <aside className="cl-sidebar space-y-5" aria-label="Your checklists">
    <div className="flex items-center gap-2"><ListChecks className="size-4 text-brand" /><p className="nf-eyebrow">Checklists</p></div>
    <nav className="cl-desktop space-y-5" aria-label="Lists">
      <Link className="cl-list-link" aria-current={pathname === PATH ? "page" : undefined} href={PATH}><span>My tasks</span><span className="tabular-nums text-xs">{taskCount}</span></Link>
      {groups.map((group) => <div key={group.label} className="space-y-1">
        <h2 className="nf-eyebrow mb-2">{group.label}</h2>
        {group.rows.map((list) => <Link key={list.id} href={`${PATH}/${list.id}`} className="cl-list-link" aria-current={pathname === `${PATH}/${list.id}` ? "page" : undefined}>
          <span className="min-w-0 break-words">{list.title}</span><span className="shrink-0 text-xs tabular-nums">{list.open}</span>
        </Link>)}
        {!group.rows.length && <p className="px-2 text-xs text-muted-foreground">No {group.label.toLowerCase()} lists yet.</p>}
      </div>)}
    </nav>
    <label className="cl-mobile space-y-2 text-sm">Choose a list
      <select className="cl-input mt-2 w-full" value={pathname} onChange={(event) => router.push(event.target.value)}>
        <option value={PATH}>My tasks ({taskCount})</option>
        {groups.map((group) => <optgroup key={group.label} label={group.label}>{group.rows.map((list) => <option key={list.id} value={`${PATH}/${list.id}`}>{list.title} ({list.open})</option>)}</optgroup>)}
        {lists.filter((list) => list.archived && `${PATH}/${list.id}` === pathname && !archived).map((list) => <option key={list.id} value={pathname}>{list.title} (archived)</option>)}
      </select>
    </label>
    <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />Show archived lists</label>
    {showForm ? <form action={action} className="space-y-3 qr-rise">
      <label htmlFor="new-list-title" className="text-sm font-medium">New list title</label>
      <Input id="new-list-title" name="title" required minLength={1} maxLength={120} autoFocus placeholder="Weekly admin" />
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={pending}>{pending ? "Creating..." : "Create list"}</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => router.replace(pathname)}>Cancel</Button></div>
    </form> : <Button variant="outline" size="sm" onClick={() => router.push(`${pathname}?new=1`)}><Plus className="size-4" />New list</Button>}
  </aside>;
}
