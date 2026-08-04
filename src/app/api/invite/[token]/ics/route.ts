import { NextResponse } from "next/server";
import { resolveInvite } from "@/lib/rsvp";
import { buildIcs } from "@/lib/ics";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const resolved = await resolveInvite(token);
  if (!resolved.ok) {
    return new NextResponse("Not found", { status: 404 });
  }
  const endsAt = new Date(resolved.event.starts_at.getTime() + 3 * 60 * 60 * 1000);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";
  const ics = buildIcs({
    uid: `${resolved.event.id}-${resolved.guest.id}`,
    title: resolved.event.title,
    description: resolved.event.description,
    location: [resolved.event.venue_name, resolved.event.venue_address].filter(Boolean).join(", "),
    startsAt: resolved.event.starts_at,
    endsAt,
    timezone: resolved.event.timezone,
    url: `${baseUrl}/invite/${token}/confirmation`,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
    },
  });
}
