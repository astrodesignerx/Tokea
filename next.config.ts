import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * pg ships native bindings and a Cloudflare-only socket import that Turbopack
   * cannot bundle, so @prisma/adapter-pg fails to resolve it and every route
   * reaching lib/db.ts returns 500. Externalising both leaves them to be
   * required at runtime on the server, which is where they always run anyway.
   */
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "sharp"],
};

export default nextConfig;
