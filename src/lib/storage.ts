import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

const COVER_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const COVER_MAX_BYTES = 8 * 1024 * 1024;

const AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: Record<string, string>;
};

async function presignUpload(input: {
  prefix: string;
  contentType: string;
  contentLength: number;
  allowedTypes: Set<string>;
  maxBytes: number;
  maxLabel: string;
}): Promise<PresignResult> {
  if (!input.allowedTypes.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (!Number.isFinite(input.contentLength) || input.contentLength <= 0) {
    throw new Error("Empty file");
  }
  if (input.contentLength > input.maxBytes) {
    throw new Error(`File too large (max ${input.maxLabel})`);
  }

  const ext = input.contentType.split("/")[1] ?? "bin";
  const key = `${input.prefix}/${randomUUID()}.${ext}`;
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

export async function presignCoverUpload(input: {
  contentType: string;
  contentLength: number;
}): Promise<PresignResult> {
  return presignUpload({
    prefix: "covers",
    contentType: input.contentType,
    contentLength: input.contentLength,
    allowedTypes: COVER_ALLOWED_TYPES,
    maxBytes: COVER_MAX_BYTES,
    maxLabel: "8MB",
  });
}

export async function presignAvatarUpload(input: {
  contentType: string;
  contentLength: number;
}): Promise<PresignResult> {
  return presignUpload({
    prefix: "avatars",
    contentType: input.contentType,
    contentLength: input.contentLength,
    allowedTypes: AVATAR_ALLOWED_TYPES,
    maxBytes: AVATAR_MAX_BYTES,
    maxLabel: "2MB",
  });
}

export function isAvatarPublicUrl(url: string): boolean {
  const raw = process.env.STORAGE_PUBLIC_URL;
  if (!raw) return false;
  const prefix = `${raw.replace(/\/$/, "")}/avatars/`;
  if (!url.startsWith(prefix) || url.length <= prefix.length) return false;
  const rest = url.slice(prefix.length);
  return /^[a-zA-Z0-9._-]+$/.test(rest);
}
