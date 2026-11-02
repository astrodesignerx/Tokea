import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { taskReminderEmail } from "@/lib/emails";
import { getCardsOrigin } from "@/lib/cards/links";
import { myTasksWhere } from "@/lib/checklists/data";
import { nairobiToday, pickDueTasks } from "@/lib/checklists/reminders";
import { dueState } from "@/lib/checklists/due-state";

export async function GET(req: Request) {
  const provided = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(`${nairobiToday(now)}T00:00:00Z`);
  const origin = await getCardsOrigin();
  const counts = { users: 0, sent: 0, skipped: 0, failed: 0 };
  let after: string | undefined;

  for (;;) {
    const users = await prisma.user.findMany({
      where: {
        ...(after ? { id: { gt: after } } : {}),
        task_reminders: true,
        OR: [{ task_reminder_sent_on: null }, { task_reminder_sent_on: { not: today } }],
        // Narrow candidates by membership, then apply the shared assignment rules per user.
        checklist_memberships: { some: { checklist: { archived_at: null,
          items: { some: { kind: "task", done_at: null, due_on: { lte: today } } },
        } } },
      },
      select: { id: true }, orderBy: { id: "asc" }, take: 100,
    });
    if (!users.length) break;
    after = users[users.length - 1].id;

    for (const candidate of users) {
      counts.users++;
      try {
        const outcome = await prisma.$transaction(async (tx) => {
          // Hold the row through sending and stamping so overlapping cron runs wait, then re-check.
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${candidate.id} FOR UPDATE`;
          const user = await tx.user.findUnique({ where: { id: candidate.id },
            select: { id: true, name: true, email: true, task_reminders: true, task_reminder_sent_on: true } });
          if (!user?.task_reminders || user.task_reminder_sent_on?.getTime() === today.getTime()) return "skipped";
          const items = await tx.checklistItem.findMany({
            where: { ...myTasksWhere(user.id), due_on: { lte: today } },
            select: { title: true, due_on: true, checklist: { select: { title: true } } },
          });
          const { tasks, total } = pickDueTasks(items.map((item) => ({
            title: item.title, due_on: item.due_on, list_title: item.checklist.title,
          })), now);
          if (!total) return "skipped";
          const template = taskReminderEmail({ name: user.name,
            overdue: tasks.filter((task) => dueState(task.due_on, now) === "overdue"),
            today: tasks.filter((task) => dueState(task.due_on, now) === "today"),
            more: total - tasks.length, myTasksUrl: `${origin}/dashboard/checklists`,
            settingsUrl: `${origin}/dashboard/checklists?settings=reminders#task-reminders`,
          });
          const result = await sendEmail({ to: user.email, ...template });
          if (!result.ok) {
            console.error("[task-reminders] send failed", user.id, result.reason);
            return "failed";
          }
          await tx.user.update({ where: { id: user.id }, data: { task_reminder_sent_on: today } });
          return "sent";
        }, { timeout: 30_000 });
        counts[outcome]++;
      } catch (error) {
        counts.failed++;
        console.error("[task-reminders] user failed", candidate.id, error);
      }
    }
  }

  return NextResponse.json(counts);
}
