import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * pg ships native bindings and a Cloudflare-only socket import that Turbopack
   * cannot bundle, so @prisma/adapter-pg fails to resolve it and every route
   * reaching lib/db.ts returns 500. Externalising both leaves them to be
   * required at runtime on the server, which is where they always run anyway.
   */
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "sharp"],
  /*
   * sharp's platform binaries (@img/sharp-*) live outside its own package
   * under pnpm's store layout, so serverless file tracing misses them and the
   * require throws at runtime — every route touching it then returns 500.
   * Included explicitly so the bundle carries the whole package.
   */
  outputFileTracingIncludes: {
    "/**": ["./node_modules/sharp/**", "./node_modules/@img/**"],
  },
};

export default nextConfig;
