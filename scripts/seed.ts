import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { mintToken } from "../src/lib/tokens.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "test@tokea.local" } });
  const user = existing ?? await prisma.user.create({
    data: { email: "test@tokea.local", name: "Test Organizer" },
  });
  console.log("USER:", user.id, user.email);

  const slug = "smoke-test-event-" + Date.now().toString(36).slice(-4);
  const event = await prisma.event.create({
    data: {
      owner_id: user.id,
      title: "Smoke Test Event",
      description: "An event used to verify the end-to-end loop.",
      slug,
      starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      timezone: "Africa/Nairobi",
      venue_name: "Tokea HQ",
      venue_address: "1 Riverside Drive",
      custom_question: "Any dietary requirements?",
      template: "image-led",
      reminder_days_before: 1,
      status: "published",
    },
  });
  console.log("EVENT:", event.id, event.slug);

  const guest = await prisma.guest.create({
    data: {
      event_id: event.id,
      name: "Ada Lovelace",
      email: "ada@example.com",
    },
  });
  console.log("GUEST:", guest.id, guest.email);

  const invite = await prisma.invite.create({
    data: {
      guest_id: guest.id,
      token: mintToken({ kind: "invite", guestId: guest.id, eventId: event.id }),
    },
  });
  console.log("INVITE:", invite.token.slice(0, 30) + "...");

  await prisma.$disconnect();
  console.log("---");
  console.log("Test these URLs:");
  console.log("  Public page:   http://localhost:3012/e/" + event.slug);
  console.log("  RSVP form:     http://localhost:3012/invite/" + invite.token);
  console.log("  Confirmation:  http://localhost:3012/invite/" + invite.token + "/confirmation");
  console.log("  Guest admin:   http://localhost:3012/dashboard/events/" + event.id + "/guests");
  console.log("  Checkin:       http://localhost:3012/dashboard/events/" + event.id + "/checkin");
}

main().catch((e) => { console.error(e); process.exit(1); });
