// Tokea Prisma config
// Loads .env first, then .env.local overrides for local dev.
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: true });

/**
 * Strips the pooler-only query parameters. Migrations run over a direct
 * connection, which rejects them.
 */
function directUrl(raw: string): string {
  return raw
    .replace(/[?&](pgbouncer|statement_cache_size|connection_limit)=[^&]*/g, "")
    .replace(/[?&]pgbouncer=true/g, "")
    .replace(/[?&]statement_cache_size=0/g, "")
    .replace(/[?&]connection_limit=\d+/g, "")
    .replace(/^([^\?]+)\?$/, "$1");
}

const raw = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

/**
 * The datasource is declared only when a URL is present.
 *
 * Throwing instead broke every build without one, including `prisma generate`,
 * which reads the schema and never opens a connection — codegen has no
 * business depending on a runtime secret. Commands that genuinely need the
 * database still fail on their own terms when it is missing.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(raw ? { datasource: { url: directUrl(raw) } } : {}),
});
