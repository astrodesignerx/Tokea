import type { CardScan, ContactCard, Organisation } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normaliseShortCode } from "@/lib/cards/short-code";

export type { CardScan, ContactCard, Organisation };

export type CardWithOrganisation = ContactCard & { organisation: Organisation };

/**
 * Read side of the digital cards feature. Everything that renders a card goes
 * through here, so the public pages never build their own queries.
 */

export async function listOrganisations(
  ownerId?: string
): Promise<Organisation[]> {
  return prisma.organisation.findMany({
    where: ownerId ? { owner_id: ownerId } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function findOrganisation(
  slug: string
): Promise<Organisation | null> {
  return prisma.organisation.findUnique({ where: { slug } });
}

export async function listCards(options?: {
  organisationSlug?: string;
  organisationId?: string;
  includeArchived?: boolean;
}): Promise<CardWithOrganisation[]> {
  return prisma.contactCard.findMany({
    where: {
      ...(options?.organisationId
        ? { organisation_id: options.organisationId }
        : {}),
      ...(options?.organisationSlug
        ? { organisation: { slug: options.organisationSlug } }
        : {}),
      ...(options?.includeArchived ? {} : { status: "active" }),
    },
    include: { organisation: true },
    orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
  });
}

export async function findCardBySlug(
  slug: string
): Promise<CardWithOrganisation | null> {
  return prisma.contactCard.findUnique({
    where: { slug },
    include: { organisation: true },
  });
}

export async function findCardById(
  id: string
): Promise<CardWithOrganisation | null> {
  return prisma.contactCard.findUnique({
    where: { id },
    include: { organisation: true },
  });
}

export async function findCardByShortCode(
  shortCode: string
): Promise<CardWithOrganisation | null> {
  // Matched case-insensitively so a code read badly by a scanner, or typed off
  // a printed card, still resolves.
  return prisma.contactCard.findUnique({
    where: { short_code: normaliseShortCode(shortCode) },
    include: { organisation: true },
  });
}

/** Scan counts for a set of cards, keyed by card id. */
export async function countScans(
  cardIds: string[]
): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map();

  const rows = await prisma.cardScan.groupBy({
    by: ["card_id"],
    where: { card_id: { in: cardIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.card_id, row._count._all]));
}

export async function recentScans(
  cardId: string,
  take = 20
): Promise<CardScan[]> {
  return prisma.cardScan.findMany({
    where: { card_id: cardId },
    orderBy: { scanned_at: "desc" },
    take,
  });
}

export function fullName(
  card: Pick<ContactCard, "first_name" | "last_name">
): string {
  return `${card.first_name} ${card.last_name}`;
}
