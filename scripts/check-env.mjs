/**
 * Reports which expected environment variables are present at build time.
 *
 *   pnpm check:env
 *
 * Prints names and presence only — never a value, so it is safe in a public
 * build log. Missing variables are reported rather than thrown on: a build can
 * legitimately proceed without the runtime-only ones, and a clear list beats
 * discovering them one failure at a time.
 */

const REQUIRED_AT_RUNTIME = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "AUTH_URL",
];

// Inlined into the client bundle during the build, so a wrong or missing value
// cannot be corrected later without rebuilding.
const REQUIRED_AT_BUILD = ["NEXT_PUBLIC_APP_URL"];

const OPTIONAL = [
  "NEXT_PUBLIC_CARDS_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "STORAGE_PUBLIC_URL",
  "STORAGE_REGION",
  "PAYSTACK_SECRET_KEY",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
];

const present = (name) => {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
};

function report(label, names) {
  console.log(`  ${label}`);
  for (const name of names) {
    console.log(`    ${present(name) ? "set    " : "MISSING"}  ${name}`);
  }
}

console.log("check:env - environment visible to this build");
report("required at runtime:", REQUIRED_AT_RUNTIME);
report("required at build time:", REQUIRED_AT_BUILD);
report("optional:", OPTIONAL);

const missingBuild = REQUIRED_AT_BUILD.filter((name) => !present(name));
const missingRuntime = REQUIRED_AT_RUNTIME.filter((name) => !present(name));

if (missingBuild.length > 0) {
  console.log(
    `\n  WARNING: ${missingBuild.join(", ")} is inlined at build time. ` +
      "Setting it after this build will not take effect until you rebuild."
  );
}

if (missingRuntime.length > 0) {
  console.log(
    `\n  WARNING: ${missingRuntime.join(", ")} missing. The build may still ` +
      "succeed, but pages that touch the database or auth will fail at runtime."
  );
}

// Never fails the build. Its job is to make the log answer the question.
process.exit(0);
