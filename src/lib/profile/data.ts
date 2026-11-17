import { prisma } from "@/lib/db";
import { myTasksWhere } from "@/lib/checklists/data";
import { dueState } from "@/lib/checklists/due-state";
import { nairobiToday } from "@/lib/checklists/reminders";

export type ActivityKind = "card_scan" | "qr_scan" | "form_response" | "rsvp";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  text: string;
  href: string;
  at: Date;
  relative: string;
};

export type ActivityGroup = {
  key: string;
  label: string;
  items: ActivityItem[];
};

export type ThisWeekTask = {
  id: string;
  title: string;
  checklistId: string;
  checklistTitle: string;
  dueLabel: string;
  overdue: boolean;
};

export type UpcomingEventItem = {
  id: string;
  title: string;
  dateLabel: string;
};

const DAY_MS = 86_400_000;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

export function nairobiDayKey(date: Date): string {
  return new Date(date.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

function formatRelative(date: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function formatGroupHeading(dayKey: string, date: Date, todayKey: string, yesterdayKey: string): string {
  if (dayKey === todayKey) return "Today";
  if (dayKey === yesterdayKey) return "Yesterday";
  const sameYear = dayKey.slice(0, 4) === todayKey.slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function formatDueDate(due: Date, todayKey: string, tomorrowKey: string): string {
  const key = due.toISOString().slice(0, 10);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(due);
}

function formatEventShortDate(startsAt: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: timezone || "Africa/Nairobi",
    }).format(startsAt);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Nairobi",
    }).format(startsAt);
  }
}

export async function getProfileData(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const thirtyDaysAhead = new Date(now.getTime() + 30 * DAY_MS);
  const todayKey = nairobiToday(now);
  const yesterdayKey = nairobiDayKey(new Date(now.getTime() - DAY_MS));
  const tomorrowKey = nairobiDayKey(new Date(now.getTime() + DAY_MS));
  const sevenDaysAheadDate = new Date(Date.parse(`${todayKey}T00:00:00Z`) + 7 * DAY_MS);

  const [
    organisations,
    companies,
    activeCards,
    cardScans30d,
    qrScans30d,
    upcomingEventsCount,
    formReplies30d,
    openChecklistTasks,
    recentCardScans,
    recentQrScans,
    recentFormResponses,
    recentRsvps,
    weekTasks,
    upcomingEvents,
  ] = await Promise.all([
    prisma.organisation.findMany({
      where: { owner_id: userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.organisation.count({ where: { owner_id: userId } }),
    prisma.contactCard.count({
      where: { organisation: { owner_id: userId }, status: "active" },
    }),
    prisma.cardScan.count({
      where: { card: { organisation: { owner_id: userId } }, scanned_at: { gte: thirtyDaysAgo } },
    }),
    prisma.qrScan.count({
      where: { qr_code: { owner_id: userId }, scanned_at: { gte: thirtyDaysAgo } },
    }),
    prisma.event.count({
      where: { owner_id: userId, starts_at: { gte: now } },
    }),
    prisma.formResponse.count({
      where: { form: { owner_id: userId }, submitted_at: { gte: thirtyDaysAgo } },
    }),
    prisma.checklistItem.count({ where: myTasksWhere(userId) }),
    prisma.cardScan.findMany({
      where: { card: { organisation: { owner_id: userId } } },
      orderBy: { scanned_at: "desc" },
      take: 12,
      select: {
        id: true,
        scanned_at: true,
        card: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            organisation: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.qrScan.findMany({
      where: { qr_code: { owner_id: userId } },
      orderBy: { scanned_at: "desc" },
      take: 12,
      select: {
        id: true,
        scanned_at: true,
        qr_code: { select: { id: true, name: true } },
      },
    }),
    prisma.formResponse.findMany({
      where: { form: { owner_id: userId } },
      orderBy: { submitted_at: "desc" },
      take: 12,
      select: {
        id: true,
        submitted_at: true,
        form: { select: { id: true, title: true } },
      },
    }),
    prisma.rSVP.findMany({
      where: { guest: { event: { owner_id: userId } } },
      orderBy: { responded_at: "desc" },
      take: 12,
      select: {
        id: true,
        status: true,
        responded_at: true,
        guest: {
          select: {
            name: true,
            event: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.checklistItem.findMany({
      where: {
        kind: "task",
        done_at: null,
        due_on: { not: null, lte: sevenDaysAheadDate },
        checklist: {
          archived_at: null,
          members: { some: { user_id: userId } },
        },
      },
      orderBy: [{ due_on: "asc" }, { position: "asc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        due_on: true,
        checklist_id: true,
        checklist: { select: { title: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        owner_id: userId,
        starts_at: { gte: now, lte: thirtyDaysAhead },
      },
      orderBy: { starts_at: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        starts_at: true,
        timezone: true,
      },
    }),
  ]);

  const merged: ActivityItem[] = [
    ...recentCardScans.map((scan) => ({
      id: `card-${scan.id}`,
      kind: "card_scan" as const,
      text: `Your card for ${scan.card.first_name} ${scan.card.last_name} was scanned`,
      href: `/dashboard/companies/${scan.card.organisation.slug}/cards/${scan.card.id}`,
      at: scan.scanned_at,
      relative: formatRelative(scan.scanned_at, now),
    })),
    ...recentQrScans.map((scan) => ({
      id: `qr-${scan.id}`,
      kind: "qr_scan" as const,
      text: `Your QR code ${scan.qr_code.name} was scanned`,
      href: `/dashboard/qr/${scan.qr_code.id}`,
      at: scan.scanned_at,
      relative: formatRelative(scan.scanned_at, now),
    })),
    ...recentFormResponses.map((response) => ({
      id: `form-${response.id}`,
      kind: "form_response" as const,
      text: `New reply to ${response.form.title}`,
      href: `/dashboard/forms/${response.form.id}?tab=responses`,
      at: response.submitted_at,
      relative: formatRelative(response.submitted_at, now),
    })),
    ...recentRsvps.map((rsvp) => ({
      id: `rsvp-${rsvp.id}`,
      kind: "rsvp" as const,
      text: `${rsvp.guest.name} RSVP'd ${rsvp.status} to ${rsvp.guest.event.title}`,
      href: `/dashboard/events/${rsvp.guest.event.id}/guests`,
      at: rsvp.responded_at,
      relative: formatRelative(rsvp.responded_at, now),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  const activityGroups: ActivityGroup[] = [];
  for (const item of merged) {
    const key = nairobiDayKey(item.at);
    const existing = activityGroups[activityGroups.length - 1];
    if (existing && existing.key === key) {
      existing.items.push(item);
    } else {
      activityGroups.push({
        key,
        label: formatGroupHeading(key, item.at, todayKey, yesterdayKey),
        items: [item],
      });
    }
  }

  const thisWeekTasks: ThisWeekTask[] = weekTasks
    .filter((item): item is typeof item & { due_on: Date } => item.due_on !== null)
    .map((item) => ({
      id: item.id,
      title: item.title,
      checklistId: item.checklist_id,
      checklistTitle: item.checklist.title,
      dueLabel: formatDueDate(item.due_on, todayKey, tomorrowKey),
      overdue: dueState(item.due_on, now) === "overdue",
    }));

  const thisWeekEvents: UpcomingEventItem[] = upcomingEvents.map((event) => ({
    id: event.id,
    title: event.title,
    dateLabel: formatEventShortDate(event.starts_at, event.timezone),
  }));

  return {
    organisations,
    stats: {
      companies,
      activeCards,
      scans30d: cardScans30d + qrScans30d,
      upcomingEvents: upcomingEventsCount,
      formReplies30d,
      openChecklistTasks,
    },
    activityGroups,
    thisWeekTasks,
    thisWeekEvents,
  };
}
