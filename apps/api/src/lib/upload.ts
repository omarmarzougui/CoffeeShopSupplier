import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const BUCKET = process.env.S3_BUCKET ?? "coffee-shop-uploads";
const PUBLIC_URL = process.env.S3_PUBLIC_URL ?? "";

export const s3 = process.env.S3_ENDPOINT
  ? new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    })
  : null;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function isAllowedFileType(mime: string): boolean {
  return ALLOWED_TYPES.has(mime);
}

export function generateUploadKey(originalName: string, mime: string): string {
  const ext = mime.split("/")[1] ?? "jpg";
  const hash = crypto.randomBytes(12).toString("hex");
  const ts = Date.now();
  return `products/${ts}-${hash}.${ext}`;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  if (!s3) {
    throw new Error("S3 storage not configured — set S3_ENDPOINT in environment");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  if (PUBLIC_URL) {
    return `${PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  return key;
}

export async function createPresignedUpload(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<{ url: string; key: string }> {
  if (!s3) {
    throw new Error("S3 storage not configured — set S3_ENDPOINT in environment");
  }

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );

  return { url, key };
}
