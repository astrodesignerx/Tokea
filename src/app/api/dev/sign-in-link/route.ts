import { NextResponse } from "next/server";
import { takeDevSignInLink } from "@/lib/dev-sign-in-links";

/**
 * Returns the magic link that could not be emailed, so the sign-in page can
 * show it during local development.
 *
 * This hands out a credential, so it is hard-disabled outside development and
 * each link is served at most once. It only ever has something to return when
 * email delivery has already failed.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const email = new URL(req.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "missing-email" }, { status: 400 });
  }

  return NextResponse.json(
    { url: takeDevSignInLink(email) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
