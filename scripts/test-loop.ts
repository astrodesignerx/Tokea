import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { mintToken, verifyToken } from "../src/lib/tokens.js";
import { submitRsvp } from "../src/lib/rsvp.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";

async function main() {
  const guest = await prisma.guest.findFirst({
    where: { email: "ada@example.com" },
    include: { event: true, invite: true },
  });
  if (!guest || !guest.invite) throw new Error("Run seed first");
  const token = guest.invite.token;
  const verified = verifyToken(token, "invite");
  if (!verified.ok) throw new Error("Token bad: " + verified.reason);
  console.log("Token valid. Guest:", guest.name, "Event:", guest.event.title);

  await submitRsvp({
    token,
    status: "yes",
    customAnswer: "Vegetarian",
    message: "Looking forward to it!",
  });
  const rsvp = await prisma.rSVP.findUnique({ where: { guest_id: guest.id } });
  console.log("RSVP recorded:", rsvp);

  const checkinToken = mintToken({ kind: "checkin", guestId: guest.id, eventId: guest.event_id });
  const checkinVerified = verifyToken(checkinToken, "checkin");
  if (!checkinVerified.ok) throw new Error("Checkin token bad");
  console.log("Checkin token valid");

  const res = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken: checkinToken, eventId: guest.event_id }),
  });
  const data = await res.json();
  console.log("First check-in:", res.status, data);

  const res2 = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken: checkinToken, eventId: guest.event_id }),
  });
  const data2 = await res2.json();
  console.log("Second check-in (should be duplicate):", res2.status, data2);

  const counts = await prisma.checkIn.count();
  const yesCount = await prisma.rSVP.count({ where: { status: "yes" } });
  console.log("DB: total check-ins:", counts, "yes RSVPs:", yesCount);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
