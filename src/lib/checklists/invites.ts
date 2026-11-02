import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { lockMembership, requireMembership } from "./access";
import { can, hashInviteToken, LIMITS, newInviteToken } from "./rules";

export class ChecklistError extends Error {}

export async function createInvite(tx: Prisma.TransactionClient, checklistId: string, userId: string, email: string) {
  const { checklist, member } = await requireMembership(checklistId, userId, tx);
  if (!can(member.role, "invite") || checklist.archived_at) throw new ChecklistError("Only the owner can invite people to an active list.");
  const now = new Date();
  const [existingMember, existingInvite, members, invites] = await Promise.all([
    tx.checklistMember.findFirst({ where: { checklist_id: checklistId, user: { email: { equals: email, mode: "insensitive" } } } }),
    tx.checklistInvite.findFirst({ where: { checklist_id: checklistId, email, accepted_at: null, expires_at: { gt: now } } }),
    tx.checklistMember.count({ where: { checklist_id: checklistId } }),
    tx.checklistInvite.count({ where: { checklist_id: checklistId, accepted_at: null, expires_at: { gt: now } } }),
  ]);
  if (existingMember) throw new ChecklistError("That person is already a member.");
  if (existingInvite) throw new ChecklistError("That address already has a pending invite.");
  if (members + invites >= LIMITS.people) throw new ChecklistError("A list can have at most 20 people, including pending invites.");
  const token = newInviteToken();
  const invite = await tx.checklistInvite.create({ data: {
    checklist_id: checklistId, email, token_hash: hashInviteToken(token), invited_by_id: userId,
    expires_at: new Date(now.getTime() + 7 * 86_400_000),
  } });
  await tx.checklistActivity.create({ data: { checklist_id: checklistId, actor_id: userId, action: "added", item_title: `Invite for ${email}` } });
  return { id: invite.id, token, title: checklist.title };
}

export async function cancelInvite(tx: Prisma.TransactionClient, checklistId: string, userId: string, inviteId: string) {
  const { member } = await requireMembership(checklistId, userId, tx);
  if (!can(member.role, "cancelInvite")) throw new ChecklistError("Only the owner can cancel invites.");
  const invite = await tx.checklistInvite.findFirst({ where: { id: inviteId, checklist_id: checklistId, accepted_at: null } });
  if (!invite) throw new ChecklistError("That invite is no longer pending.");
  await tx.checklistInvite.delete({ where: { id: invite.id } });
  await tx.checklistActivity.create({ data: { checklist_id: checklistId, actor_id: userId, action: "removed", item_title: `Invite for ${invite.email}` } });
}

/** A token grants only the right to join as its email address, never to read tasks. */
export async function acceptInvite(token: string, user: { id: string; email: string }) {
  return prisma.$transaction(async (tx) => {
    const hash = hashInviteToken(token);
    const initial = await tx.checklistInvite.findUnique({ where: { token_hash: hash }, select: { checklist_id: true } });
    if (!initial) throw new ChecklistError("This invite is no longer available.");
    await tx.$queryRaw`SELECT id FROM "Checklist" WHERE id = ${initial.checklist_id} FOR UPDATE`;
    const invite = await tx.checklistInvite.findUnique({ where: { token_hash: hash }, include: { checklist: true } });
    if (!invite || invite.accepted_at || invite.expires_at <= new Date()) throw new ChecklistError("This invite has expired or has already been used.");
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) throw new ChecklistError("Sign in with the email address this invite was sent to.");
    if (invite.checklist.archived_at) throw new ChecklistError("This list is archived. Ask its owner to restore it.");
    const existing = await tx.checklistMember.findUnique({ where: { checklist_id_user_id: { checklist_id: invite.checklist_id, user_id: user.id } } });
    if (!existing) {
      const count = await tx.checklistMember.count({ where: { checklist_id: invite.checklist_id } });
      if (count >= LIMITS.people) throw new ChecklistError("This list already has 20 members.");
      await tx.checklistMember.create({ data: { checklist_id: invite.checklist_id, user_id: user.id, role: "editor" } });
      await tx.checklistActivity.create({ data: { checklist_id: invite.checklist_id, actor_id: user.id, action: "joined" } });
    }
    await tx.checklistInvite.update({ where: { id: invite.id }, data: { accepted_at: new Date() } });
    // Clear any duplicate pending invites for this address so they cannot be reused later.
    await tx.checklistInvite.deleteMany({ where: { checklist_id: invite.checklist_id, email: invite.email, accepted_at: null, id: { not: invite.id } } });
    await requireMembership(invite.checklist_id, user.id, tx);
    return invite.checklist_id;
  });
}

/** Also used to roll back a pending invite when delivery fails. */
export async function cancelUndeliveredInvite(checklistId: string, userId: string, inviteId: string) {
  return prisma.$transaction(async (tx) => {
    await lockMembership(tx, checklistId, userId);
    const pending = await tx.checklistInvite.findFirst({ where: { id: inviteId, checklist_id: checklistId, accepted_at: null } });
    if (pending) await cancelInvite(tx, checklistId, userId, inviteId);
  });
}
