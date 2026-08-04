import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEventCounts } from "@/lib/queries/events";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/db");
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.owner_id !== session.user.id) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const counts = await getEventCounts(id);
  return NextResponse.json(counts);
}
