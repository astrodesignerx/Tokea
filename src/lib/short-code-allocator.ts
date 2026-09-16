import { prisma } from "@/lib/db";
import { generateShortCode } from "@/lib/cards/short-code";

/**
 * Hands out a short code no card and no QR code already uses.
 *
 * Cards resolve under /s and QR codes under /q, so a shared code would not
 * misroute today. Keeping one namespace anyway means the two routes can be
 * merged later without auditing every printed code for clashes.
 */
export async function allocateShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateShortCode();
    const [card, qr] = await Promise.all([
      prisma.contactCard.findUnique({ where: { short_code: candidate } }),
      prisma.qrCode.findUnique({ where: { short_code: candidate } }),
    ]);
    if (!card && !qr) return candidate;
  }
  throw new Error("Could not allocate a unique short code");
}
