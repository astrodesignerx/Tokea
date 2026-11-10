import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function isPagesStorageConfigured(): boolean {
  return ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "UPLOADS_BUCKET"].every((key) => Boolean(process.env[key]?.trim()));
}

function storage() {
  if (!isPagesStorageConfigured()) throw new Error("Pages storage is not configured.");
  return new S3Client({
    endpoint: process.env.R2_ENDPOINT!,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    region: "auto",
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 2000, requestTimeout: 5000 },
  });
}

const bucket = () => process.env.UPLOADS_BUCKET!;

export async function presignPut(key: string, mime: string, size: number) {
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mime, ContentLength: size });
  const client = storage();
  try {
    const url = await getSignedUrl(client, command, { expiresIn: 60, signableHeaders: new Set(["content-type"]) });
    return { url, headers: { "Content-Type": mime } };
  } finally {
    client.destroy();
  }
}

export async function headMatches(key: string, mime: string, size: number): Promise<boolean> {
  const client = storage();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return head.ContentLength === size && head.ContentType === mime;
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw error;
  } finally {
    client.destroy();
  }
}

export async function presignView(key: string, mime: string, fileName: string, disposition: "inline" | "attachment") {
  const name = fileName.replace(/[\x00-\x1f\x7f/\\]/g, "_");
  const fallback = name.replace(/[^a-zA-Z0-9._ -]/g, "_") || "download";
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const command = new GetObjectCommand({
    Bucket: bucket(), Key: key, ResponseContentType: mime,
    ResponseCacheControl: "private, no-store",
    ResponseContentDisposition: `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`,
  });
  const client = storage();
  try {
    return await getSignedUrl(client, command, { expiresIn: 900 });
  } finally {
    client.destroy();
  }
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  const client = storage();
  try {
    for (let start = 0; start < keys.length; start += 1000) {
      const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: keys.slice(start, start + 1000).map((Key) => ({ Key })), Quiet: true } }));
      if (result.Errors?.length) throw new Error("Some page files could not be removed. Try again.");
    }
  } finally {
    client.destroy();
  }
}
