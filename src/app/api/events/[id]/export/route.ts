import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.owner_id !== session.user.id) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const guests = await prisma.guest.findMany({
    where: { event_id: id },
    orderBy: { created_at: "asc" },
    include: { rsvp: true, invite: true, checkin: true },
  });

  const lines = ["name,email,phone,rsvp,invited,checked_in,responded_at"];
  for (const g of guests) {
    const rsvp = g.rsvp?.status ?? "pending";
    const invited = g.invite?.sent_at ? "yes" : "no";
    const checked = g.checkin ? "yes" : "no";
    const responded = g.rsvp?.responded_at ? g.rsvp.responded_at.toISOString() : "";
    const cells = [g.name, g.email, g.phone ?? "", rsvp, invited, checked, responded].map(csvCell);
    lines.push(cells.join(","));
  }
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tokea-${event.slug}-guests.csv"`,
    },
  });
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
