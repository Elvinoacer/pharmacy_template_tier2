import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

/**
 * Cloudflare R2 storage helpers (S3-compatible API).
 *
 * Required env:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL   — public base URL of the bucket (custom domain or *.r2.dev)
 *
 * Optional:
 *   R2_ENDPOINT    — defaults to https://<accountId>.r2.cloudflarestorage.com
 */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** Max upload size (5 MiB). */
export const R2_MAX_BYTES = 5 * 1024 * 1024;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim().replace(/\/$/, "") ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, endpoint };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_TYPES.has(contentType.toLowerCase());
}

let client: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 is path-style; forcePathStyle avoids virtual-hosted-style quirks.
      forcePathStyle: true,
    });
  }
  return client;
}

/** Sanitize a folder segment so object keys stay clean. */
export function sanitizeFolder(folder?: string | null): string {
  const raw = (folder || "uploads").trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
  return cleaned || "uploads";
}

function extensionFor(file: File, contentType: string): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return EXT_BY_TYPE[contentType.toLowerCase()] || "bin";
}

export type UploadResult = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

/**
 * Upload a browser File / Blob to R2 and return the public URL.
 */
export async function uploadToR2(
  file: File | Blob,
  opts?: { folder?: string; filename?: string },
): Promise<UploadResult> {
  const config = getR2Config();
  if (!config) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.",
    );
  }

  const contentType =
    (file instanceof File ? file.type : "") ||
    (file as Blob).type ||
    "application/octet-stream";

  if (!isAllowedImageType(contentType)) {
    throw new Error(
      `Unsupported file type "${contentType}". Allowed: JPEG, PNG, WebP, GIF, SVG.`,
    );
  }

  const size = file.size;
  if (size <= 0) throw new Error("Empty file.");
  if (size > R2_MAX_BYTES) {
    throw new Error(`File too large. Max size is ${R2_MAX_BYTES / (1024 * 1024)} MB.`);
  }

  const folder = sanitizeFolder(opts?.folder);
  const asFile = file instanceof File ? file : new File([file], opts?.filename || "upload");
  const ext = extensionFor(asFile, contentType);
  const key = `${folder}/${randomUUID()}.${ext}`;

  const body = Buffer.from(await file.arrayBuffer());
  const s3 = getClient(config);

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Public reads go through R2_PUBLIC_URL / custom domain; no ACL needed on R2.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicUrl}/${key}`,
    contentType,
    size,
  };
}

/**
 * Delete an object by key (or by full public URL under R2_PUBLIC_URL).
 */
export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("Cloudflare R2 is not configured.");

  let key = keyOrUrl.trim();
  if (key.startsWith(config.publicUrl + "/")) {
    key = key.slice(config.publicUrl.length + 1);
  } else if (key.startsWith("http://") || key.startsWith("https://")) {
    // Not an R2 URL we manage — nothing to delete.
    return;
  }

  key = key.replace(/^\/+/, "");
  if (!key) return;

  const s3 = getClient(config);
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}
