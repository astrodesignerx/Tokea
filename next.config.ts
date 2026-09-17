import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * pg ships native bindings and a Cloudflare-only socket import that Turbopack
   * cannot bundle, so @prisma/adapter-pg fails to resolve it and every route
   * reaching lib/db.ts returns 500. Externalising both leaves them to be
   * required at runtime on the server, which is where they always run anyway.
   */
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],

  /*
   * Compact QR codes encode their link in capitals (QR "alphanumeric" mode
   * only has capitals, and packs a link into far fewer squares). Domains are
   * case-insensitive but paths are not, so /Q/<CODE> is mapped onto the real
   * route, which already lower-cases the code. Never remove this: printed
   * compact codes depend on it.
   */
  async rewrites() {
    return [{ source: "/Q/:code", destination: "/q/:code" }];
  },
};

export default nextConfig;
