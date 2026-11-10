import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// PDF.js loads these on demand for unembedded fonts, CJK text and image codecs.
// Copy from the installed dependency so the assets match the worker version.
export function preparePagesPdfAssets() {
  const require = createRequire(import.meta.url);
  const source = dirname(require.resolve("pdfjs-dist/package.json"));
  const { version } = require("pdfjs-dist/package.json");
  const destination = join(process.cwd(), "public", "pages-pdf", version);
  mkdirSync(destination, { recursive: true });
  for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
    cpSync(join(source, directory), join(destination, directory), { recursive: true });
  }
  cpSync(join(source, "LICENSE"), join(destination, "LICENSE"));
}
