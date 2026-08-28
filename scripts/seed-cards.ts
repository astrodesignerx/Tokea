/**
 * Seeds Energy 4 Impact and its five cards.
 *
 * The short codes are hard-coded and must stay exactly as they are: they were
 * issued before the database existed, and any QR code already generated or
 * printed resolves through them. Everything else here is safe to change.
 *
 * Idempotent: upserts on slug, so running it twice is harmless.
 *
 *   pnpm seed:cards you@example.com
 */

// Same env loading as the other scripts: .env first, .env.local overriding.
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const ORG = {
  slug: "energy-4-impact",
  name: "Energy 4 Impact",
  legal_name: "Energy 4 Impact",
  website: "https://www.energy4impact.org",
  website_label: "www.energy4impact.org",
  logo_url: "/brand/energy4impact.png",
  tagline: "Putting energy at the heart of development.",
  // Sampled from the client's printed card artwork.
  brand_primary: "#1DB8AF",
  brand_secondary: "#87CFC8",
  brand_accent: "#F1666B",
  brand_ink: "#464F58",
};

const CARDS = [
  {
    slug: "mathieu-dalle",
    short_code: "qutuw2jx",
    first_name: "Mathieu",
    last_name: "Dalle",
    title: "Director of Advisory and Programs",
    email: "mdalle@mercycorps.org",
  },
  {
    slug: "matia-mandela",
    short_code: "a9mxc84h",
    first_name: "Matia",
    last_name: "Mandela",
    title: "Program Director",
    email: "mmandela@mercycorps.org",
  },
  {
    slug: "mercy-rose",
    short_code: "2rtgyh54",
    first_name: "Mercy",
    last_name: "Rose",
    title: "Head of Partnerships and Business Development",
    email: "mrose@mercycorps.org",
  },
  {
    slug: "kariuki-njoroge",
    short_code: "gj2x3434",
    first_name: "Kariuki",
    last_name: "Njoroge",
    title: "Program Manager, PREO",
    email: "jonjoroge@mercycorps.org",
  },
  {
    slug: "pancras-odhiambo",
    short_code: "k5majdcg",
    first_name: "Pancras",
    last_name: "Odhiambo",
    title: "Program Manager & Regional Technical Specialist",
    email: "paodhiambo@mercycorps.org",
  },
];

async function main() {
  const ownerEmail = process.argv[2];
  if (!ownerEmail) {
    throw new Error("Usage: pnpm seed:cards <owner-email>");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) {
      throw new Error(
        `No user with email "${ownerEmail}". Sign in once to create the account, then re-run.`
      );
    }

    const org = await prisma.organisation.upsert({
      where: { slug: ORG.slug },
      create: { ...ORG, owner_id: owner.id },
      update: ORG,
    });
    console.log(`Organisation: ${org.name} (${org.slug})`);

    for (const card of CARDS) {
      const record = await prisma.contactCard.upsert({
        where: { slug: card.slug },
        create: {
          ...card,
          organisation_id: org.id,
          destination: `/c/${card.slug}`,
        },
        // short_code is deliberately not updated: it is the one field that
        // must never move once a card exists.
        update: {
          first_name: card.first_name,
          last_name: card.last_name,
          title: card.title,
          email: card.email,
          organisation_id: org.id,
        },
      });
      console.log(`  /s/${record.short_code} -> ${record.destination}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
