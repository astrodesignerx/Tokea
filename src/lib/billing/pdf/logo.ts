import { open, realpath } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 2 * 1024 * 1024;

function asImage(bytes: Buffer, mime: string): string | null {
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((mime === "image/png" && png) || (mime === "image/jpeg" && jpeg)) {
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }
  return null;
}

/** Only raster logos are passed to react-pdf. All failures use the text fallback. */
export async function loadBillingLogo(source: string | null | undefined): Promise<string | null> {
  try {
    if (!source) return null;
    if (source.startsWith("/") && !source.startsWith("//")) {
      const decoded = decodeURIComponent(source);
      if (decoded.includes("\\") || decoded.includes("\0") || decoded.includes("?") || decoded.includes("#")) return null;
      const root = await realpath(path.join(process.cwd(), "public"));
      const file = await realpath(path.resolve(root, `.${decoded}`));
      const relative = path.relative(root, file);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
      const ext = path.extname(file).toLowerCase();
      const mime = ext === ".png" ? "image/png" : [".jpg", ".jpeg"].includes(ext) ? "image/jpeg" : "";
      if (!mime) return null;
      const handle = await open(file, "r");
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_BYTES) return null;
        // Bound the read even if the file grows after stat.
        const bytes = Buffer.alloc(Math.min(stat.size + 1, MAX_BYTES + 1));
        const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
        return asImage(bytes.subarray(0, bytesRead), mime);
      } finally { await handle.close(); }
    }

    let url = new URL(source);
    const signal = AbortSignal.timeout(5000);
    // Follow redirects ourselves so no redirect can change the allowed protocol.
    for (let redirect = 0; redirect <= 3; redirect++) {
      if (url.protocol !== "https:" || url.username || url.password) return null;
      const response = await fetch(url, { signal, redirect: "manual", cache: "no-store" });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location) return null;
        url = new URL(location, url);
        continue;
      }
      const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      if (!response.ok || !["image/png", "image/jpeg"].includes(mime) || Number(response.headers.get("content-length")) > MAX_BYTES) {
        await response.body?.cancel();
        return null;
      }
      if (!response.body) return null;
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) { await reader.cancel(); return null; }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      return asImage(Buffer.concat(chunks), mime);
    }
  } catch { /* A missing or unsupported logo must never prevent a PDF. */ }
  return null;
}
