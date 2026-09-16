import type {
  QrCode,
  QrLinkChange,
  QrScan,
  QrScheduledChange,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normaliseShortCode } from "@/lib/cards/short-code";
import type { DailyCount } from "@/lib/cards/analytics";

export type { QrCode, QrLinkChange, QrScan, QrScheduledChange };

/**
 * Read side of dynamic QR codes. Every owner-facing query takes the owner id,
 * so one account can never read another's codes or scans.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Swaps in any scheduled destination changes that have come due, oldest first,
 * logging each replaced link to the history. Returns how many were applied.
 *
 * Each change is claimed with a conditional update inside the transaction, so
 * two scans arriving together cannot both apply it.
 */
export async function applyDueScheduledChanges(qrCodeIds: string[]): Promise<number> {
  if (qrCodeIds.length === 0) return 0;
  const now = new Date();

  const due = await prisma.qrScheduledChange.findMany({
    where: { qr_code_id: { in: qrCodeIds }, applied_at: null, run_at: { lte: now } },
    orderBy: { run_at: "asc" },
  });

  let applied = 0;
  for (const change of due) {
    const done = await prisma.$transaction(async (tx) => {
      const claim = await tx.qrScheduledChange.updateMany({
        where: { id: change.id, applied_at: null },
        data: { applied_at: now },
      });
      if (claim.count === 0) return false;

      const code = await tx.qrCode.findUnique({ where: { id: change.qr_code_id } });
      if (!code || code.destination === change.destination) return true;

      await tx.qrLinkChange.create({
        data: { qr_code_id: code.id, destination: code.destination },
      });
      await tx.qrCode.update({
        where: { id: code.id },
        data: { destination: change.destination },
      });
      return true;
    });
    if (done) applied++;
  }
  return applied;
}

export type QrListRow = QrCode & { scans: number; lastScan: Date | null };

export async function listQrCodes(
  ownerId: string,
  options?: { includeArchived?: boolean }
): Promise<QrListRow[]> {
  const owned = await prisma.qrCode.findMany({
    where: { owner_id: ownerId },
    select: { id: true },
  });
  await applyDueScheduledChanges(owned.map((c) => c.id));

  const codes = await prisma.qrCode.findMany({
    where: {
      owner_id: ownerId,
      ...(options?.includeArchived ? {} : { status: { not: "archived" } }),
    },
    include: { _count: { select: { scans: true } } },
    orderBy: { created_at: "desc" },
  });

  if (codes.length === 0) return [];

  const last = await prisma.qrScan.groupBy({
    by: ["qr_code_id"],
    where: { qr_code_id: { in: codes.map((c) => c.id) } },
    _max: { scanned_at: true },
  });
  const lastById = new Map(last.map((row) => [row.qr_code_id, row._max.scanned_at]));

  return codes.map(({ _count, ...code }) => ({
    ...code,
    scans: _count.scans,
    lastScan: lastById.get(code.id) ?? null,
  }));
}

export async function countArchivedQrCodes(ownerId: string): Promise<number> {
  return prisma.qrCode.count({ where: { owner_id: ownerId, status: "archived" } });
}

export async function findOwnedQrCode(
  ownerId: string,
  id: string
): Promise<QrCode | null> {
  const code = await prisma.qrCode.findFirst({ where: { id, owner_id: ownerId } });
  if (!code) return null;
  const applied = await applyDueScheduledChanges([code.id]);
  return applied > 0 ? prisma.qrCode.findUnique({ where: { id } }) : code;
}

/** Public lookup for the redirect. Case-insensitive, like card codes. */
export async function findQrCodeByShortCode(shortCode: string): Promise<QrCode | null> {
  const where = { short_code: normaliseShortCode(shortCode) };
  const code = await prisma.qrCode.findUnique({ where });
  if (!code) return null;
  const applied = await applyDueScheduledChanges([code.id]);
  return applied > 0 ? prisma.qrCode.findUnique({ where }) : code;
}

/** Everything the edit page shows below the form, in one round of queries. */
export async function getQrCodeActivity(qrCodeId: string, days = 30) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(today - (days - 1) * DAY);

  const [total, windowScans, recent, countries, history, devices, scheduled] = await Promise.all([
    prisma.qrScan.count({ where: { qr_code_id: qrCodeId } }),
    prisma.qrScan.findMany({
      where: { qr_code_id: qrCodeId, scanned_at: { gte: since } },
      select: { scanned_at: true },
    }),
    prisma.qrScan.findMany({
      where: { qr_code_id: qrCodeId },
      orderBy: { scanned_at: "desc" },
      take: 8,
    }),
    prisma.qrScan.groupBy({
      by: ["country"],
      where: { qr_code_id: qrCodeId, country: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 5,
    }),
    prisma.qrLinkChange.findMany({
      where: { qr_code_id: qrCodeId },
      orderBy: { changed_at: "desc" },
      take: 10,
    }),
    prisma.qrScan.groupBy({
      by: ["device"],
      where: { qr_code_id: qrCodeId },
      _count: { _all: true },
    }),
    prisma.qrScheduledChange.findMany({
      where: { qr_code_id: qrCodeId, applied_at: null },
      orderBy: { run_at: "asc" },
    }),
  ]);

  // Same in-memory bucketing as the cards analytics page.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(new Date(since.getTime() + i * DAY).toISOString().slice(0, 10), 0);
  }
  for (const { scanned_at } of windowScans) {
    const key = scanned_at.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const daily: DailyCount[] = [...buckets].map(([date, count]) => ({ date, count }));

  return {
    total,
    daily,
    recent,
    countries: countries.map((row) => ({
      country: row.country ?? "",
      count: row._count._all,
    })),
    history,
    devices: devices
      .map((row) => ({ device: row.device ?? "other", count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    scheduled,
  };
}
