/**
 * Verifies the STORAGE_* environment variables actually work end to end.
 *
 *   pnpm check:storage
 *
 * Runs the same code path the app uses: presign a URL, upload a 1x1 PNG,
 * read it back over the public URL, inspect the bucket's CORS policy, then
 * delete the test object. Each step reports on its own so a failure points at
 * the specific setting that is wrong.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { S3Client, DeleteObjectCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { presignCoverUpload } from "../src/lib/storage.js";

const REQUIRED = [
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "STORAGE_BUCKET",
  "STORAGE_PUBLIC_URL",
] as const;

// A valid 1x1 transparent PNG.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const pass = (msg: string) => console.log(`  PASS  ${msg}`);
const fail = (msg: string) => console.log(`  FAIL  ${msg}`);
const warn = (msg: string) => console.log(`  WARN  ${msg}`);

function checkEnv(): boolean {
  console.log("\n1. Environment variables");
  let ok = true;
  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value) {
      fail(`${key} is not set`);
      ok = false;
    } else if (value.includes("placeholder")) {
      fail(`${key} is still the placeholder value`);
      ok = false;
    } else {
      pass(key);
    }
  }
  if (process.env["STORAGE_REGION"] !== "auto") {
    warn(`STORAGE_REGION is "${process.env["STORAGE_REGION"]}" , but R2 expects "auto"`);
  }
  return ok;
}

/**
 * Sends the exact preflight a browser sends before a presigned PUT. This is
 * the authoritative check: it works no matter what the API token is allowed to
 * read, and it tests the rule the browser will actually apply.
 */
async function checkCors(client: S3Client, bucket: string, uploadUrl: string) {
  console.log("\n5. Bucket CORS policy");
  const origin = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3012";

  const res = await fetch(uploadUrl, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  const allowOrigin = res.headers.get("access-control-allow-origin");
  const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
  const allowHeaders = (res.headers.get("access-control-allow-headers") ?? "").toLowerCase();

  if (!allowOrigin) {
    fail(`Preflight from ${origin} was refused (HTTP ${res.status}).`);
    fail("Browser uploads will be blocked. Add a CORS policy in the bucket's Settings:");
    fail("see the Storage section of README.md for the exact JSON.");
    process.exitCode = 1;
    return;
  }
  pass(`Preflight accepted from ${origin}`);

  if (allowMethods.includes("PUT")) {
    pass("PUT is allowed");
  } else {
    fail(`PUT is not in the allowed methods (got "${allowMethods}").`);
    process.exitCode = 1;
  }

  if (allowHeaders.includes("content-type")) {
    pass("Content-Type header is allowed");
  } else {
    fail(`Content-Type is not an allowed header (got "${allowHeaders}").`);
    fail('Add "Content-Type" to AllowedHeaders. Uploads send it and will be rejected without it.');
    process.exitCode = 1;
  }

  // Extra detail when the token happens to permit reading the config.
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const origins = (res.CORSRules ?? []).flatMap((r) => r.AllowedOrigins ?? []);
    if (origins.length > 0) console.log(`        configured origins: ${origins.join(", ")}`);
  } catch {
    // Scoped tokens usually cannot read this. The preflight above already
    // answered the question, so stay quiet.
  }
}

async function main() {
  console.log("Checking Tokea storage configuration...");

  if (!checkEnv()) {
    console.log("\nFix the variables above, then run this again.");
    process.exitCode = 1;
    return;
  }

  console.log("\n2. Presigning an upload URL");
  const presigned = await presignCoverUpload({
    contentType: "image/png",
    contentLength: TEST_PNG.byteLength,
  });
  pass(`Signed a URL for ${presigned.key}`);

  console.log("\n3. Uploading a test image");
  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: presigned.headers,
    body: TEST_PNG,
  });
  if (!put.ok) {
    fail(`Upload rejected with HTTP ${put.status}`);
    fail(await put.text().then((t) => t.slice(0, 300)).catch(() => "no response body"));
    fail("Usually means the access key, secret, endpoint, or bucket name is wrong.");
    process.exitCode = 1;
    return;
  }
  pass("Uploaded");

  console.log("\n4. Reading it back from the public URL");
  const get = await fetch(presigned.publicUrl);
  if (get.ok) {
    pass(`${presigned.publicUrl} is publicly readable`);
  } else {
    fail(`Public URL returned HTTP ${get.status}`);
    fail("Enable public access on the bucket, and check STORAGE_PUBLIC_URL is the public hostname.");
    process.exitCode = 1;
  }

  const client = new S3Client({
    endpoint: process.env["STORAGE_ENDPOINT"],
    region: process.env["STORAGE_REGION"] ?? "auto",
    credentials: {
      accessKeyId: process.env["STORAGE_ACCESS_KEY"]!,
      secretAccessKey: process.env["STORAGE_SECRET_KEY"]!,
    },
    forcePathStyle: true,
  });

  await checkCors(client, process.env["STORAGE_BUCKET"]!, presigned.uploadUrl);

  console.log("\n6. Cleaning up");
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env["STORAGE_BUCKET"], Key: presigned.key }),
    );
    pass("Test image deleted");
  } catch {
    warn(`Could not delete the test image. Remove ${presigned.key} manually if you care.`);
  }

  console.log(
    process.exitCode === 1
      ? "\nSome checks failed. See above.\n"
      : "\nStorage is configured correctly. Cover uploads will work.\n",
  );
}

main().catch((err) => {
  console.error("\nCheck failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
