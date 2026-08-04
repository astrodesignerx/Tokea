import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { presignCoverUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    contentType?: string;
    contentLength?: number;
  };
  if (!body.contentType || typeof body.contentLength !== "number") {
    return NextResponse.json({ error: "missing-params" }, { status: 400 });
  }
  try {
    const result = await presignCoverUpload({
      contentType: body.contentType,
      contentLength: body.contentLength,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "presign-failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
