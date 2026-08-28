/**
 * Digital business card records.
 *
 * This is the seam the rest of the card feature reads through. Everything is
 * async already, so swapping this static array for Prisma queries in phase 2
 * is a change to this file alone.
 */

export type Organisation = {
  slug: string;
  /** Trading name shown on the card and in the dashboard. */
  name: string;
  /** Name written into the vCard ORG field. */
  legalName: string;
  website: string;
  websiteLabel: string;
  logo: string;
  logoAlt: string;
  tagline?: string;
};

export type Card = {
  slug: string;
  /**
   * Immutable public identifier that printed QR codes encode. NEVER change or
   * recycle one of these: any card already printed or written to an NFC tag
   * resolves through it. The slug can change freely, this cannot.
   */
  shortCode: string;
  /**
   * Where the short code currently sends people. Normally this card's own page,
   * but it is stored rather than derived so a code can be repointed later
   * without reprinting anything.
   */
  destination: string;
  organisationSlug: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  status: "active" | "archived";
};

const ORGANISATIONS: Organisation[] = [
  {
    slug: "energy-4-impact",
    name: "Energy 4 Impact",
    legalName: "Energy 4 Impact",
    website: "https://www.energy4impact.org",
    websiteLabel: "www.energy4impact.org",
    logo: "/brand/energy4impact.png",
    logoAlt: "Energy 4 Impact",
    tagline: "Putting energy at the heart of development.",
  },
];

const CARDS: Card[] = [
  {
    slug: "mathieu-dalle",
    shortCode: "qutuw2jx",
    destination: "/c/mathieu-dalle",
    organisationSlug: "energy-4-impact",
    firstName: "Mathieu",
    lastName: "Dalle",
    title: "Director of Advisory and Programs",
    email: "mdalle@mercycorps.org",
    status: "active",
  },
  {
    slug: "matia-mandela",
    shortCode: "a9mxc84h",
    destination: "/c/matia-mandela",
    organisationSlug: "energy-4-impact",
    firstName: "Matia",
    lastName: "Mandela",
    title: "Program Director",
    email: "mmandela@mercycorps.org",
    status: "active",
  },
  {
    slug: "mercy-rose",
    shortCode: "2rtgyh54",
    destination: "/c/mercy-rose",
    organisationSlug: "energy-4-impact",
    firstName: "Mercy",
    lastName: "Rose",
    title: "Head of Partnerships and Business Development",
    email: "mrose@mercycorps.org",
    status: "active",
  },
  {
    slug: "kariuki-njoroge",
    shortCode: "gj2x3434",
    destination: "/c/kariuki-njoroge",
    organisationSlug: "energy-4-impact",
    firstName: "Kariuki",
    lastName: "Njoroge",
    title: "Program Manager, PREO",
    email: "jonjoroge@mercycorps.org",
    status: "active",
  },
  {
    slug: "pancras-odhiambo",
    shortCode: "k5majdcg",
    destination: "/c/pancras-odhiambo",
    organisationSlug: "energy-4-impact",
    firstName: "Pancras",
    lastName: "Odhiambo",
    title: "Program Manager & Regional Technical Specialist",
    email: "paodhiambo@mercycorps.org",
    status: "active",
  },
];

export type CardWithOrganisation = Card & { organisation: Organisation };

export async function listOrganisations(): Promise<Organisation[]> {
  return ORGANISATIONS;
}

export async function findOrganisation(
  slug: string
): Promise<Organisation | undefined> {
  return ORGANISATIONS.find((org) => org.slug === slug);
}

export async function listCards(options?: {
  organisationSlug?: string;
}): Promise<CardWithOrganisation[]> {
  return CARDS.filter(
    (card) =>
      !options?.organisationSlug ||
      card.organisationSlug === options.organisationSlug
  ).map(attachOrganisation);
}

export async function findCardBySlug(
  slug: string
): Promise<CardWithOrganisation | undefined> {
  const card = CARDS.find((entry) => entry.slug === slug);
  return card ? attachOrganisation(card) : undefined;
}

export async function findCardByShortCode(
  shortCode: string
): Promise<CardWithOrganisation | undefined> {
  // Codes are case-insensitive so a QR read badly, or a code typed off a
  // printed card, still resolves.
  const normalised = shortCode.trim().toLowerCase();
  const card = CARDS.find((entry) => entry.shortCode === normalised);
  return card ? attachOrganisation(card) : undefined;
}

export function fullName(card: Pick<Card, "firstName" | "lastName">): string {
  return `${card.firstName} ${card.lastName}`;
}

function attachOrganisation(card: Card): CardWithOrganisation {
  const organisation = ORGANISATIONS.find(
    (org) => org.slug === card.organisationSlug
  );

  if (!organisation) {
    throw new Error(
      `Card "${card.slug}" references unknown organisation "${card.organisationSlug}"`
    );
  }

  return { ...card, organisation };
}
