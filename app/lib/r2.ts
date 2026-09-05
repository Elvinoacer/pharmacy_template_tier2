import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const R2_MAX_BYTES = 5 * 1024 * 1024;
const PRIVATE_PREFIX = "r2-private://";
const MEDIA_TOKEN_TTL_SECONDS = 15 * 60;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

export type PrivateR2Config = Omit<R2Config, "publicUrl">;

function baseConfig() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  const endpoint =
    process.env.R2_ENDPOINT?.trim().replace(/\/$/, "") ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  return { accountId, accessKeyId, secretAccessKey, endpoint };
}

export function getR2Config(): R2Config | null {
  const base = baseConfig();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!base || !bucket || !publicUrl) return null;
  return { ...base, bucket, publicUrl };
}

export function getPrivateR2Config(): PrivateR2Config | null {
  const base = baseConfig();
  const bucket = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
  if (!base || !bucket) return null;
  return { ...base, bucket };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function isPrivateR2Configured(): boolean {
  return getPrivateR2Config() !== null;
}

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_TYPES.has(contentType.toLowerCase());
}

let client: S3Client | null = null;

function getClient(config: Pick<R2Config, "accountId" | "accessKeyId" | "secretAccessKey" | "endpoint">): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export function sanitizeFolder(folder?: string | null): string {
  const raw = (folder || "uploads").trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
  return cleaned || "uploads";
}

function extensionFor(contentType: string): string {
  return EXT_BY_TYPE[contentType.toLowerCase()] || "bin";
}

function sniffImageType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "image/png";

  if (
    bytes.length >= 6 &&
    String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a"
  ) return "image/gif";
  if (
    bytes.length >= 6 &&
    String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a"
  ) return "image/gif";

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";

  return null;
}

async function validatedImage(file: File | Blob) {
  const declared = ((file instanceof File ? file.type : "") || file.type || "").toLowerCase();
  if (!isAllowedImageType(declared)) {
    throw new Error(
      `Unsupported file type "${declared || "unknown"}". Allowed: JPEG, PNG, WebP, GIF.`,
    );
  }
  if (file.size <= 0) throw new Error("Empty file.");
  if (file.size > R2_MAX_BYTES) {
    throw new Error(`File too large. Max size is ${R2_MAX_BYTES / (1024 * 1024)} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer.subarray(0, 32));
  if (!sniffed) throw new Error("File contents are not a supported image format.");
  const normalizedDeclared = declared === "image/jpg" ? "image/jpeg" : declared;
  if (sniffed !== normalizedDeclared) {
    throw new Error(`Image content does not match declared type (${declared}).`);
  }
  return { body: buffer, contentType: sniffed, size: file.size };
}

export type UploadResult = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

export type PrivateUploadResult = {
  key: string;
  reference: string;
  contentType: string;
  size: number;
};

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

  const validated = await validatedImage(file);
  const folder = sanitizeFolder(opts?.folder);
  const key = `${folder}/${randomUUID()}.${extensionFor(validated.contentType)}`;
  const s3 = getClient(config);

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: validated.body,
      ContentType: validated.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicUrl}/${key}`,
    contentType: validated.contentType,
    size: validated.size,
  };
}

/** Upload sensitive health media into a private bucket. */
export async function uploadPrivateImageToR2(
  file: File | Blob,
  opts?: { folder?: string },
): Promise<PrivateUploadResult> {
  const config = getPrivateR2Config();
  if (!config) {
    throw new Error(
      "Private R2 storage is not configured. Set R2_PRIVATE_BUCKET_NAME before accepting health-media uploads.",
    );
  }
  const validated = await validatedImage(file);
  const folder = sanitizeFolder(opts?.folder || "health-media");
  const key = `${folder}/${randomUUID()}.${extensionFor(validated.contentType)}`;
  const s3 = getClient(config);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: validated.body,
      ContentType: validated.contentType,
      CacheControl: "private, no-store, max-age=0",
    }),
  );
  return {
    key,
    reference: `${PRIVATE_PREFIX}${key}`,
    contentType: validated.contentType,
    size: validated.size,
  };
}

export function isPrivateR2Reference(value: string): boolean {
  return value.startsWith(PRIVATE_PREFIX);
}

export function privateR2Key(value: string): string | null {
  if (!isPrivateR2Reference(value)) return null;
  const key = value.slice(PRIVATE_PREFIX.length).replace(/^\/+/, "");
  return key || null;
}

export async function readPrivateR2Object(referenceOrKey: string): Promise<{
  body: Buffer;
  contentType: string;
} | null> {
  const config = getPrivateR2Config();
  if (!config) return null;
  const key = privateR2Key(referenceOrKey) ?? referenceOrKey.replace(/^\/+/, "");
  if (!key) return null;
  const s3 = getClient(config);
  const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!result.Body) return null;
  const bytes = await result.Body.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: result.ContentType || "application/octet-stream",
  };
}

export async function privateR2ReferenceToDataUrl(reference: string): Promise<string | null> {
  const object = await readPrivateR2Object(reference);
  if (!object) return null;
  return `data:${object.contentType};base64,${object.body.toString("base64")}`;
}

function mediaTokenSecret(): string {
  const secret =
    process.env.HEALTH_MEDIA_SIGNING_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("health_media_signing_secret_missing");
  return secret;
}

function mediaSignature(payload: string): string {
  return createHmac("sha256", mediaTokenSecret()).update(payload).digest("base64url");
}

export function createPrivateMediaToken(reference: string, ttlSeconds = MEDIA_TOKEN_TTL_SECONDS): string {
  const key = privateR2Key(reference);
  if (!key) throw new Error("invalid_private_media_reference");
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
  const payload = Buffer.from(JSON.stringify({ key, exp }), "utf8").toString("base64url");
  return `${payload}.${mediaSignature(payload)}`;
}

export function verifyPrivateMediaToken(token: string): { key: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = mediaSignature(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      key?: string;
      exp?: number;
    };
    if (!parsed.key || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { key: parsed.key };
  } catch {
    return null;
  }
}

export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("Cloudflare R2 is not configured.");

  let key = keyOrUrl.trim();
  if (key.startsWith(config.publicUrl + "/")) {
    key = key.slice(config.publicUrl.length + 1);
  } else if (key.startsWith("http://") || key.startsWith("https://")) {
    return;
  }

  key = key.replace(/^\/+/, "");
  if (!key) return;

  const s3 = getClient(config);
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function deletePrivateFromR2(referenceOrKey: string): Promise<void> {
  const config = getPrivateR2Config();
  if (!config) throw new Error("Private R2 is not configured.");
  const key = privateR2Key(referenceOrKey) ?? referenceOrKey.replace(/^\/+/, "");
  if (!key) return;
  const s3 = getClient(config);
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
