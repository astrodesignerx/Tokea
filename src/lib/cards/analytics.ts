import { prisma } from "@/lib/db";

/**
 * Read models for the analytics page. Every query is scoped to one owner, so a
 * signed-in user can only ever see their own activity.
 */

export type DailyCount = { date: string; count: number };

export type LinkRow = {
  cardId: string;
  name: string;
  company: string;
  companySlug: string;
  shortCode: string;
  destination: string;
  status: string;
  scans: number;
  lastScan: Date | null;
};

export type ScanRow = {
  id: string;
  scannedAt: Date;
  country: string | null;
  cardName: string;
  shortCode: string;
};

const DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC for a date, so buckets line up regardless of when the query runs. */
function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date): string {
  return startOfDayUtc(d).toISOString().slice(0, 10);
}

export async function getAnalytics(ownerId: string, days = 30) {
  const since = new Date(startOfDayUtc(new Date()).getTime() - (days - 1) * DAY);
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY);

  const ownedCards = { organisation: { owner_id: ownerId } };

  const [totalScans, recentScanCount, activeCards, archivedCards, companies, cards, windowScans, recent] =
    await Promise.all([
      prisma.cardScan.count({ where: { card: ownedCards } }),
      prisma.cardScan.count({
        where: { card: ownedCards, scanned_at: { gte: sevenDaysAgo } },
      }),
      prisma.contactCard.count({ where: { ...ownedCards, status: "active" } }),
      prisma.contactCard.count({ where: { ...ownedCards, status: "archived" } }),
      prisma.organisation.count({ where: { owner_id: ownerId } }),
      prisma.contactCard.findMany({
        where: ownedCards,
        include: {
          organisation: { select: { name: true, slug: true } },
          _count: { select: { scans: true } },
        },
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
      }),
      // Only the timestamp is needed for the chart, so only that is selected.
      prisma.cardScan.findMany({
        where: { card: ownedCards, scanned_at: { gte: since } },
        select: { scanned_at: true },
      }),
      prisma.cardScan.findMany({
        where: { card: ownedCards },
        orderBy: { scanned_at: "desc" },
        take: 12,
        include: {
          card: { select: { first_name: true, last_name: true, short_code: true } },
        },
      }),
    ]);

  // Bucket in memory rather than in SQL: Prisma cannot group by a truncated
  // date without raw SQL, and at this volume the difference is not measurable.
  // Revisit with a raw query if a single account ever passes tens of thousands.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(isoDay(new Date(since.getTime() + i * DAY)), 0);
  }
  for (const scan of windowScans) {
    const key = isoDay(scan.scanned_at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const daily: DailyCount[] = [...buckets].map(([date, count]) => ({ date, count }));

  // Last scan per card, from the same rows already fetched for the table.
  const lastScanByCard = new Map<string, Date>();
  const lastScans = await prisma.cardScan.groupBy({
    by: ["card_id"],
    where: { card: ownedCards },
    _max: { scanned_at: true },
  });
  for (const row of lastScans) {
    if (row._max.scanned_at) lastScanByCard.set(row.card_id, row._max.scanned_at);
  }

  const links: LinkRow[] = cards
    .map((card) => ({
      cardId: card.id,
      name: `${card.first_name} ${card.last_name}`,
      company: card.organisation.name,
      companySlug: card.organisation.slug,
      shortCode: card.short_code,
      destination: card.destination,
      status: card.status,
      scans: card._count.scans,
      lastScan: lastScanByCard.get(card.id) ?? null,
    }))
    .sort((a, b) => b.scans - a.scans);

  const recentScans: ScanRow[] = recent.map((scan) => ({
    id: scan.id,
    scannedAt: scan.scanned_at,
    country: scan.country,
    cardName: `${scan.card.first_name} ${scan.card.last_name}`,
    shortCode: scan.card.short_code,
  }));

  return {
    totals: {
      totalScans,
      recentScanCount,
      activeCards,
      archivedCards,
      companies,
    },
    daily,
    links,
    recentScans,
  };
}
