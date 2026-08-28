// Tokea Prisma config
// Loads .env first, then .env.local overrides for local dev.
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: true });

function buildDirectUrl(): string {
  const u = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
  if (!u) throw new Error("DATABASE_URL is not set");
  return u
    .replace(/[?&](pgbouncer|statement_cache_size|connection_limit)=[^&]*/g, "")
    .replace(/[?&]pgbouncer=true/g, "")
    .replace(/[?&]statement_cache_size=0/g, "")
    .replace(/[?&]connection_limit=\d+/g, "")
    .replace(/^([^\?]+)\?$/, "$1");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildDirectUrl(),
  },
});
