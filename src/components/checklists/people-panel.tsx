"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore, LogOut, Trash2, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import * as actions from "@/lib/actions/checklists";
import type { Person, PendingInvite } from "@/lib/checklists/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { Select } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/checklists/repeat";
import { AnimatedReveal } from "./animated-reveal";

const operations = {
  invite: actions.inviteChecklistMemberAction, cancel: actions.cancelChecklistInviteAction,
  remove: actions.removeChecklistMemberAction, leave: actions.leaveChecklistAction,
  rename: actions.renameChecklistAction, archive: actions.archiveChecklistAction, restore: actions.restoreChecklistAction,
  repeat: actions.setChecklistRepeatAction,
};

export function PeoplePanel({ checklistId, title, members, invites, userId, role, archived, repeat, repeatWeekday }: {
  checklistId: string; title: string; members: Person[]; invites: PendingInvite[]; userId: string; role: string; archived: boolean;
  repeat: string; repeatWeekday: number | null;
}) {
  const owner = role === "owner";
  const [confirming, setConfirming] = useState(false);
  const [schedule, setSchedule] = useState(repeat);
  const [state, action, actionPending] = useActionState(async (prev: actions.ChecklistState, form: FormData) => {
    const operation = String(form.get("operation")) as keyof typeof operations;
    if (!(operation in operations)) return { error: "Choose a valid action.", errorAt: Date.now() };
    return operations[operation](prev, form);
  }, { error: null });
  const pending = actionPending || confirming;
  async function confirm(operation: "remove" | "cancel" | "leave", values: Record<string, string> = {}) {
    const form = new FormData();
    form.set("checklist_id", checklistId);
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    setConfirming(true);
    try {
      const result = await operations[operation]({ error: null }, form);
      if (result.error) throw new Error(result.error);
      toast.success("Changes saved.");
    } finally {
      setConfirming(false);
    }
  }
  const fields = (operation: keyof typeof operations) => <>
    <input type="hidden" name="checklist_id" value={checklistId} /><input type="hidden" name="operation" value={operation} />
  </>;

  return <section className="space-y-5" aria-label="People and list settings">
    <h2 className="nf-eyebrow">People ({members.length})</h2>
    {state.error && <p role="alert" className="qr-fade text-sm text-destructive">{state.error}</p>}
    {state.savedAt && !state.error && <p role="status" className="qr-fade text-xs text-muted-foreground">Changes saved.</p>}
    <ul className="space-y-3">
      {members.map((person) => <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="min-w-0 break-words"><p className="font-medium">{person.user_id === userId ? "You" : person.user.name || person.user.email}</p>
          <p className="text-xs text-muted-foreground">{person.role === "owner" ? "Owner" : "Can edit"}</p></div>
        {owner && person.role !== "owner" && <HoldToConfirm label={`Hold to remove ${person.user.name || person.user.email}`} icon={<UserMinus className="size-4 shrink-0" />} className="h-auto min-h-9 break-all" disabled={pending} onConfirm={() => confirm("remove", { user_id: person.user_id })} />}
      </li>)}
    </ul>
    {!!invites.length && <div className="space-y-3"><h3 className="nf-eyebrow">Pending invites</h3>
      {invites.map((invite) => <div key={invite.id} className="text-xs">
        <p className="break-all">{invite.email}</p><p className="mt-1 text-muted-foreground">Expires {new Date(invite.expires_at).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" })}</p>
        {owner && <HoldToConfirm label={`Hold to cancel invite for ${invite.email}`} icon={<X className="size-4 shrink-0" />} className="mt-1 h-auto min-h-9 break-all" disabled={pending} onConfirm={() => confirm("cancel", { invite_id: invite.id })} />}
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
        <form action={action} className="space-y-2">{fields("repeat")}
          <label htmlFor="repeat-list" className="text-xs">Repeat list</label>
          <Select id="repeat-list" name="repeat" value={schedule} onChange={(event) => setSchedule(event.target.value)} disabled={pending}>
            <option value="none">Never</option><option value="daily">Every day</option><option value="weekly">Every week</option>
          </Select>
          <AnimatedReveal open={schedule === "weekly"}><div className="space-y-2">
            <label htmlFor="repeat-weekday" className="text-xs">Every week on</label>
            <Select id="repeat-weekday" name="repeat_weekday" defaultValue={repeatWeekday ?? 1} disabled={pending || schedule !== "weekly"}>
              {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </Select>
          </div></AnimatedReveal>
          <p className="text-xs text-muted-foreground">Tasks reset at midnight in Nairobi. Assignees and due dates stay. The first reset is at the next scheduled midnight.</p>
          <Button size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save repeat schedule"}</Button>
        </form>
        <form action={action}>{fields(archived ? "restore" : "archive")}<Button size="sm" variant="outline" disabled={pending}>{archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}{archived ? "Restore list" : "Archive list"}</Button></form>
        <p className="text-xs text-muted-foreground">Deleting a list permanently removes its tasks, invites and activity.</p>
        <HoldToConfirm label="Hold to delete list" icon={<Trash2 className="size-4" />} disabled={pending} onConfirm={async () => {
          const form = new FormData(); form.set("checklist_id", checklistId);
          const result = await actions.deleteChecklistAction({ error: null }, form);
          if (result.error) throw new Error(result.error);
        }} />
      </div>
    </details> : <div className="border-t pt-4"><HoldToConfirm label="Hold to leave list" icon={<LogOut className="size-4" />} disabled={pending} onConfirm={() => confirm("leave")} /><p className="mt-2 text-xs text-muted-foreground">Your open tasks will become unassigned.</p></div>}
  </section>;
}
