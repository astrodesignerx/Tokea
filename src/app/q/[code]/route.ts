import { after } from "next/server";
import { cookies } from "next/headers";
import { getCardsOrigin } from "@/lib/cards/links";
import { prisma } from "@/lib/db";
import { findQrCodeByShortCode } from "@/lib/qr-codes/data";
import {
  QR_INDEX_PATH,
  detectDevice,
  isExpired,
  pickDestination,
  qrPath,
  withUtm,
} from "@/lib/qr-codes/links";
import { isUnlocked, unlockCookieName } from "@/lib/qr-codes/password";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * Resolves a printed dynamic QR code to wherever it points today.
 *
 * Same rules as the card redirect in src/app/s/[code]/route.ts, for the same
 * reasons: always 307 (a 301/308 is cached forever by browsers and would
 * freeze the destination) and always no-store.
 *
 * Order of checks: paused or archived, then expired, then password, then the
 * per-device link. Only scans that are actually forwarded get counted.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { code } = await params;
  const origin = await getCardsOrigin();
  const unavailable = new URL(QR_INDEX_PATH, origin).toString();

  const qr = await findQrCodeByShortCode(code);
  if (!qr || qr.status !== "active") return redirectTo(unavailable);

  const userAgent = request.headers.get("user-agent");
  const device = detectDevice(userAgent);
  const target = pickDestination(qr, device);
  if (target === null) return redirectTo(unavailable);

  // Expired codes forward without a password: the follow-up link is the
  // "this has ended" message, not the protected content.
  if (qr.password_hash && !isExpired(qr)) {
    const jar = await cookies();
    const token = jar.get(unlockCookieName(qr.short_code))?.value;
    if (!isUnlocked(qr.short_code, qr.password_hash, token)) {
      return redirectTo(new URL(`${qrPath(qr.short_code)}/unlock`, origin).toString());
    }
  }

  let location: string;
  try {
    location = withUtm(target, qr);
  } catch {
    // A destination that no longer parses still lands somewhere useful.
    return redirectTo(unavailable);
  }

  // Logged after the response is sent, so a slow write never delays a scan.
  after(async () => {
    try {
      await prisma.qrScan.create({
        data: {
          qr_code_id: qr.id,
          referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
          user_agent: userAgent?.slice(0, 500) ?? null,
          country: request.headers.get("x-vercel-ip-country") ?? null,
          device,
        },
      });
    } catch {
      // Analytics are not worth failing a scan over.
    }
  });

  return redirectTo(location);
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    headers: {
      Location: location,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
