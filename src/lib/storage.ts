import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

function getClient() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  const region = process.env.STORAGE_REGION ?? "auto";
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage credentials are not configured");
  }
  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

const BUCKET = () => {
  const b = process.env.STORAGE_BUCKET;
  if (!b) throw new Error("STORAGE_BUCKET is not set");
  return b;
};

const PUBLIC_URL = () => {
  const u = process.env.STORAGE_PUBLIC_URL;
  if (!u) throw new Error("STORAGE_PUBLIC_URL is not set");
  return u.replace(/\/$/, "");
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: Record<string, string>;
};

export async function presignCoverUpload(input: {
  contentType: string;
  contentLength: number;
}): Promise<PresignResult> {
  if (!ALLOWED_TYPES.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (input.contentLength > MAX_BYTES) {
    throw new Error("File too large (max 8MB)");
  }

  const ext = input.contentType.split("/")[1] ?? "bin";
  const key = `covers/${randomUUID()}.${ext}`;
  const client = getClient();
  const cmd = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    CacheControl: "public, max-age=31536000, immutable",
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 60 });
  return {
    uploadUrl,
    publicUrl: `${PUBLIC_URL()}/${key}`,
    key,
    headers: { "Content-Type": input.contentType },
  };
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

export function publicUrlForKey(key: string): string {
  return `${PUBLIC_URL()}/${key}`;
}
