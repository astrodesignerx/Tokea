import { prisma } from "@/lib/db";
import { generateShortCode } from "@/lib/cards/short-code";

/**
 * Hands out a short code no card, QR code or Page already uses.
 *
 * Cards resolve under /s and QR codes under /q, so a shared code would not
 * misroute today. Keeping one namespace anyway means these routes can be
 * merged later without auditing every printed code for clashes. Pages under
 * /p share this namespace, including deleted pages whose codes stay reserved.
 */
export async function allocateShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateShortCode();
    const [card, qr, page] = await Promise.all([
      prisma.contactCard.findUnique({ where: { short_code: candidate } }),
      prisma.qrCode.findUnique({ where: { short_code: candidate } }),
      prisma.page.findUnique({ where: { short_code: candidate } }),
    ]);
    if (!card && !qr && !page) return candidate;
  }
  throw new Error("Could not allocate a unique short code");
}
