/**
 * Fails if tracked source code imports a file that Git does not track.
 *
 *   pnpm check:imports
 *
 * This is the class of bug that broke two Vercel deployments: the build works
 * on the machine where the untracked file happens to exist, and dies in CI,
 * which only ever sees what was committed. Running a build locally cannot
 * catch it, because the file is right there.
 *
 * Checks the index rather than the working tree, so `git add` then run this
 * and it tells you whether what you are about to commit stands on its own.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|css)$/;

// Resolution order mirrors what bundlers try for an extensionless specifier.
const SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];

// Written by `prisma generate` during the build and deliberately gitignored,
// so an import of it is correct even though no file is tracked.
const GENERATED = [/^src\/generated\//];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
}

let tracked;
try {
  tracked = new Set(git("ls-files"));
} catch {
  // No git binary, or a build from a tarball rather than a clone. The check
  // cannot run, and it must never be the reason a deploy fails: its whole
  // purpose is catching this locally, before anything is pushed.
  console.log("check:imports - skipped, no git repository available here.");
  process.exit(0);
}

if (tracked.size === 0) {
  console.log("check:imports - skipped, no tracked files reported.");
  process.exit(0);
}

/** Pulls specifiers out of import/export/require/@import forms. */
function specifiers(code) {
  const found = [];
  const patterns = [
    /(?:^|\s)(?:import|export)\s[^;'"]*?from\s*["']([^"']+)["']/g,
    /(?:^|\s)import\s*["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /@import\s+(?:url\()?["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

/** Turns a specifier into a repo-relative path, or null if it is a package. */
function resolvePath(spec, fromFile) {
  if (spec.startsWith("@/")) return "src/" + spec.slice(2);
  if (!spec.startsWith(".")) return null;

  const dir = fromFile.split("/").slice(0, -1);
  const parts = spec.split("/");
  const out = [...dir];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

const problems = [];

for (const file of tracked) {
  if (!SOURCE.test(file)) continue;

  let code;
  try {
    code = readFileSync(file, "utf8");
  } catch {
    continue; // Staged as deleted; nothing to read.
  }

  for (const spec of specifiers(code)) {
    // A .js specifier may point at a .ts source, as the seed script does.
    const base = resolvePath(spec, file);
    if (base === null) continue;

    const candidates = [base, base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")];
    const resolved = candidates.some((candidate) =>
      SUFFIXES.some((suffix) => tracked.has(candidate + suffix))
    );
    if (resolved) continue;

    if (GENERATED.some((pattern) => pattern.test(base))) continue;

    problems.push({ file, spec });
  }
}

if (problems.length === 0) {
  console.log("check:imports - every import resolves to a tracked file.");
  process.exit(0);
}

console.error(
  `check:imports - ${problems.length} import(s) point at files Git does not track.\n` +
    "These build locally and fail in CI. Commit the files, or drop the import.\n"
);
for (const { file, spec } of problems) {
  console.error(`  ${file}\n    imports ${spec}`);
}
process.exit(1);
