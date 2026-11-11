import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env.local", override: true });

async function main() {
  const [code, option, ...extra] = process.argv.slice(2);
  if (!code || (option && option !== "--unblock") || extra.length) {
    console.error("Usage: pnpm exec tsx scripts/block-page.ts <code> [--unblock]");
    process.exitCode = 1;
    return;
  }
  const { prisma } = await import("../src/lib/db");
  try {
    const result = await prisma.page.updateMany({ where: { short_code: code }, data: { blocked_at: option === "--unblock" ? null : new Date() } });
    if (!result.count) { console.error("Page not found."); process.exitCode = 1; return; }
    console.log(option === "--unblock" ? "Page unblocked." : "Page blocked.");
  } finally { await prisma.$disconnect(); }
}

void main().catch(() => { console.error("Could not update the page block status."); process.exitCode = 1; });
