import assert from "node:assert/strict";
import { DeleteObjectsCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Prisma } from "../src/generated/prisma/client";
import { checkPageQuota, lockPageOwner } from "../src/lib/pages/access";
import { MAX_BYTES } from "../src/lib/pages/rules";
import { deleteObjects, headMatches, isPagesStorageConfigured, presignPut, presignView } from "../src/lib/pages/storage";

async function main() {
  // Dummy credentials and a mocked transport make these checks entirely offline.
  Object.assign(process.env, { R2_ENDPOINT: "https://storage.invalid", R2_ACCESS_KEY_ID: "dummy-pages-key", R2_SECRET_ACCESS_KEY: "dummy-pages-secret", UPLOADS_BUCKET: "dummy-pages-bucket" });
  assert.equal(isPagesStorageConfigured(), true);
  delete process.env.UPLOADS_BUCKET;
  assert.equal(isPagesStorageConfigured(), false);
  process.env.UPLOADS_BUCKET = "dummy-pages-bucket";

  const put = await presignPut("pages/test", "text/html; charset=utf-8", 10);
  const putUrl = new URL(put.url);
  assert.equal(putUrl.searchParams.get("X-Amz-Expires"), "60");
  assert.ok(putUrl.searchParams.get("X-Amz-SignedHeaders")?.split(";").includes("content-type"));
  assert.deepEqual(put.headers, { "Content-Type": "text/html; charset=utf-8" });
  const view = new URL(await presignView("pages/test", "application/pdf", "Report \"café\"\r\n/2026.pdf", "attachment"));
  assert.equal(view.searchParams.get("X-Amz-Expires"), "900");
  assert.equal(view.searchParams.get("response-content-type"), "application/pdf");
  assert.equal(view.searchParams.get("response-cache-control"), "private, no-store");
  const disposition = view.searchParams.get("response-content-disposition")!;
  assert.ok(disposition.startsWith("attachment; filename=\""));
  assert.ok(disposition.includes("filename*=UTF-8''Report%20%22caf%C3%A9%22___2026.pdf"));
  assert.ok(!/[\r\n]/.test(disposition));
  const inline = new URL(await presignView("pages/test", "image/svg+xml", "image.svg", "inline"));
  assert.ok(inline.searchParams.get("response-content-disposition")?.startsWith("inline;"));

  let head = { ContentLength: 10, ContentType: "application/pdf" };
  let headFailure: number | null = null;
  let deleteFailure = false;
  const batches: number[] = [];
  const original = S3Client.prototype.send;
  S3Client.prototype.send = (async (command: unknown) => {
    if (command instanceof HeadObjectCommand) {
      if (headFailure) throw { $metadata: { httpStatusCode: headFailure } };
      return head;
    }
    assert.ok(command instanceof DeleteObjectsCommand, "Unexpected network request");
    batches.push(command.input.Delete!.Objects!.length);
    return deleteFailure ? { Errors: [{ Key: "pages/test", Code: "AccessDenied" }] } : {};
  }) as typeof original;
  try {
    assert.equal(await headMatches("pages/test", "application/pdf", 10), true);
    assert.equal(await headMatches("pages/test", "text/html", 10), false);
    assert.equal(await headMatches("pages/test", "application/pdf", 11), false);
    head = { ContentLength: 0, ContentType: "application/pdf" };
    assert.equal(await headMatches("pages/test", "application/pdf", 10), false);
    headFailure = 404;
    assert.equal(await headMatches("pages/test", "application/pdf", 10), false);
    headFailure = 503;
    await assert.rejects(headMatches("pages/test", "application/pdf", 10));
    await deleteObjects([]);
    assert.deepEqual(batches, []);
    await deleteObjects(Array.from({ length: 1001 }, (_, index) => `pages/${index}`));
    assert.deepEqual(batches, [1000, 1]);
    deleteFailure = true;
    await assert.rejects(deleteObjects(["pages/test"]), /could not be removed/);
  } finally { S3Client.prototype.send = original; }

  let pages = Array.from({ length: 50 }, (_, index) => ({ id: String(index), current_file: { size: 1, confirmed_at: new Date() } }));
  let locked = false;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, owner: string) => {
      assert.equal(strings.join("?"), 'SELECT id FROM "User" WHERE id = ? FOR UPDATE');
      assert.equal(owner, "owner");
      locked = true;
    },
    page: { findMany: async (query: { where: { owner_id: string; deleted_at: unknown } }) => {
      assert.equal(locked, true);
      assert.deepEqual(query.where, { owner_id: "owner", deleted_at: null });
      return pages;
    } },
  } as unknown as Prisma.TransactionClient;
  await lockPageOwner(tx, "owner");
  await assert.rejects(checkPageQuota(tx, "owner", 1), /50 pages/);
  await checkPageQuota(tx, "owner", 1, "0");
  pages = [{ id: "0", current_file: { size: MAX_BYTES, confirmed_at: new Date() } }];
  await assert.rejects(checkPageQuota(tx, "owner", 1), /1 GB/);
  await checkPageQuota(tx, "owner", MAX_BYTES, "0");
  console.log("Pages storage checks passed: signed MIME and expiry, safe filenames, HEAD validation, deletion failures, owner locking and replacement quotas. No network or database used.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
