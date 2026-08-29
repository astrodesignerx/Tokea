import { NextResponse, type NextRequest } from "next/server";

// Sessions are stored in the database (see lib/auth.ts), so the cookie is an
// opaque session id that cannot be validated at the edge without a DB round
// trip. This only does the cheap check: no cookie at all means definitely
// signed out, and every /dashboard route still calls requireUser()
// server-side for the real check.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export default function proxy(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
