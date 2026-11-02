"use client";

import { useActionState } from "react";
import * as actions from "@/lib/actions/checklists";
import type { Person, PendingInvite } from "@/lib/checklists/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";

const operations = {
  invite: actions.inviteChecklistMemberAction, cancel: actions.cancelChecklistInviteAction,
  remove: actions.removeChecklistMemberAction, leave: actions.leaveChecklistAction,
  rename: actions.renameChecklistAction, archive: actions.archiveChecklistAction, restore: actions.restoreChecklistAction,
};

export function PeoplePanel({ checklistId, title, members, invites, userId, role, archived }: {
  checklistId: string; title: string; members: Person[]; invites: PendingInvite[]; userId: string; role: string; archived: boolean;
}) {
  const owner = role === "owner";
  const [state, action, pending] = useActionState(async (prev: actions.ChecklistState, form: FormData) => {
    const operation = String(form.get("operation")) as keyof typeof operations;
    if (!(operation in operations)) return { error: "Choose a valid action.", errorAt: Date.now() };
    return operations[operation](prev, form);
  }, { error: null });
  const fields = (operation: keyof typeof operations) => <>
    <input type="hidden" name="checklist_id" value={checklistId} /><input type="hidden" name="operation" value={operation} />
  </>;

  return <section className="space-y-5" aria-label="People and list settings">
    <h2 className="nf-eyebrow">People ({members.length})</h2>
    {state.error && <p role="alert" className="qr-fade text-sm text-destructive">{state.error}</p>}
    {state.savedAt && !state.error && <p role="status" className="text-xs text-muted-foreground">Changes saved.</p>}
    <ul className="space-y-3">
      {members.map((person) => <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="min-w-0 break-words"><p className="font-medium">{person.user_id === userId ? "You" : person.user.name || person.user.email}</p>
          <p className="text-xs text-muted-foreground">{person.role === "owner" ? "Owner" : "Can edit"}</p></div>
        {owner && person.role !== "owner" && <form action={action}>{fields("remove")}<input type="hidden" name="user_id" value={person.user_id} /><Button size="sm" variant="ghost" disabled={pending} aria-label={`Remove ${person.user.name || person.user.email}`}>Remove</Button></form>}
      </li>)}
    </ul>
    {!!invites.length && <div className="space-y-3"><h3 className="nf-eyebrow">Pending invites</h3>
      {invites.map((invite) => <div key={invite.id} className="text-xs">
        <p className="break-all">{invite.email}</p><p className="mt-1 text-muted-foreground">Expires {new Date(invite.expires_at).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" })}</p>
        {owner && <form action={action}>{fields("cancel")}<input type="hidden" name="invite_id" value={invite.id} /><Button size="sm" variant="ghost" disabled={pending} aria-label={`Cancel invite for ${invite.email}`}>Cancel invite</Button></form>}
      </div>)}
    </div>}
    {owner && !archived && <form action={action} className="space-y-2">{fields("invite")}
      <label htmlFor="invite-email" className="text-sm font-medium">Invite by email</label>
      <Input id="invite-email" type="email" name="email" required maxLength={254} placeholder="teammate@example.com" disabled={pending || members.length + invites.length >= 20} />
      <Button size="sm" variant="outline" disabled={pending || members.length + invites.length >= 20}>Send invite</Button>
      <p className="text-xs text-muted-foreground">Invites last 7 days. Everyone who joins can edit tasks.</p>
    </form>}
    {owner ? <details className="border-t pt-4"><summary className="cursor-pointer text-sm font-medium">List settings</summary>
      <div className="mt-4 space-y-4 qr-fade">
        <form action={action} className="space-y-2">{fields("rename")}<label htmlFor="rename-list" className="text-xs">List title</label><Input id="rename-list" name="title" defaultValue={title} required maxLength={120} /><Button size="sm" variant="outline" disabled={pending}>Rename list</Button></form>
        <form action={action}>{fields(archived ? "restore" : "archive")}<Button size="sm" variant="outline" disabled={pending}>{archived ? "Restore list" : "Archive list"}</Button></form>
        <p className="text-xs text-muted-foreground">Deleting a list permanently removes its tasks, invites and activity.</p>
        <HoldToConfirm label="Hold to delete list" disabled={pending} onConfirm={async () => {
          const form = new FormData(); form.set("checklist_id", checklistId);
          const result = await actions.deleteChecklistAction({ error: null }, form);
          if (result.error) throw new Error(result.error);
        }} />
      </div>
    </details> : <form action={action} className="border-t pt-4">{fields("leave")}<Button size="sm" variant="outline" disabled={pending}>Leave list</Button><p className="mt-2 text-xs text-muted-foreground">Your open tasks will become unassigned.</p></form>}
  </section>;
}
