import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const PRIVATE_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const R2_MAX_BYTES = 5 * 1024 * 1024;
export const PRIVATE_IMAGE_MAX_PIXELS = 20_000_000;
export const PRIVATE_IMAGE_MAX_DIMENSION = 8_192;
const PRIVATE_PREFIX = "r2-private://";
const MEDIA_TOKEN_TTL_SECONDS = 5 * 60;
const PRIVATE_ENVELOPE_MAGIC = Buffer.from("AETHR2E1", "ascii");
const PRIVATE_IV_BYTES = 12;
const PRIVATE_TAG_BYTES = 16;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

export type PrivateR2Config = Omit<R2Config, "publicUrl"> & {
  /** Shared/public R2 buckets must encrypt private objects at the application layer. */
  encrypted: boolean;
};

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

/**
 * Derive a storage-only encryption key from the app session secret. This keeps
 * the existing deployment configuration working without exposing private
 * regulatory/health media when the normal R2 bucket has public delivery.
 */
function privateStorageEncryptionKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update("aether/private-r2-storage-encryption/v1")
    .digest();
}

function privateR2Configs(): PrivateR2Config[] {
  const base = baseConfig();
  if (!base) return [];

  const dedicatedBucket = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
  const sharedBucket = process.env.R2_BUCKET_NAME?.trim();
  const encryptionReady = privateStorageEncryptionKey() !== null;
  const configs: PrivateR2Config[] = [];

  if (dedicatedBucket) {
    const sameAsShared = Boolean(sharedBucket && dedicatedBucket === sharedBucket);
    if (!sameAsShared || encryptionReady) {
      configs.push({ ...base, bucket: dedicatedBucket, encrypted: sameAsShared });
    }
  }

  // Backward-compatible secure fallback: reuse the platform's configured R2
  // bucket, but only with authenticated encryption because that bucket may be
  // reachable through R2_PUBLIC_URL/r2.dev.
  if (sharedBucket && sharedBucket !== dedicatedBucket && encryptionReady) {
    configs.push({ ...base, bucket: sharedBucket, encrypted: true });
  }

  return configs;
}

export function getPrivateR2Config(): PrivateR2Config | null {
  return privateR2Configs()[0] ?? null;
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
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

function jpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    const marker = buf[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > buf.length) break;
    const len = buf.readUInt16BE(offset);
    if (len < 2 || offset + len > buf.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (len >= 7) {
        return { height: buf.readUInt16BE(offset + 3), width: buf.readUInt16BE(offset + 5) };
      }
      break;
    }
    offset += len;
  }
  return null;
}

function webpDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + buf.readUIntLE(24, 3);
    const height = 1 + buf.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === "VP8L" && buf.length >= 25 && buf[20] === 0x2f) {
    const b1 = buf[21], b2 = buf[22], b3 = buf[23], b4 = buf[24];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return { width, height };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    for (let i = 20; i + 9 < Math.min(buf.length, 64); i++) {
      if (buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a) {
        return {
          width: buf.readUInt16LE(i + 3) & 0x3fff,
          height: buf.readUInt16LE(i + 5) & 0x3fff,
        };
      }
    }
  }
  return null;
}

function imageDimensions(buf: Buffer, contentType: string): { width: number; height: number } | null {
  if (contentType === "image/png" && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (contentType === "image/gif" && buf.length >= 10) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (contentType === "image/jpeg") return jpegDimensions(buf);
  if (contentType === "image/webp") return webpDimensions(buf);
  return null;
}

function assertSafeDimensions(buf: Buffer, contentType: string) {
  const dims = imageDimensions(buf, contentType);
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    throw new Error("Could not validate image dimensions.");
  }
  if (dims.width > PRIVATE_IMAGE_MAX_DIMENSION || dims.height > PRIVATE_IMAGE_MAX_DIMENSION) {
    throw new Error(`Image dimensions exceed ${PRIVATE_IMAGE_MAX_DIMENSION}px.`);
  }
  if (dims.width * dims.height > PRIVATE_IMAGE_MAX_PIXELS) {
    throw new Error("Image pixel count is too large.");
  }
}

function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) break;
    const markerStart = offset;
    const marker = buf[offset + 1];
    offset += 2;
    if (marker === 0xda) {
      parts.push(buf.subarray(markerStart));
      return Buffer.concat(parts);
    }
    if (marker === 0xd9) {
      parts.push(buf.subarray(markerStart, offset));
      return Buffer.concat(parts);
    }
    if (offset + 2 > buf.length) return buf;
    const len = buf.readUInt16BE(offset);
    if (len < 2 || offset + len > buf.length) return buf;
    const end = offset + len;
    // APP1=EXIF/XMP, APP13=IPTC, COM=free-form comments. Remove privacy-bearing metadata.
    if (![0xe1, 0xed, 0xfe].includes(marker)) parts.push(buf.subarray(markerStart, end));
    offset = end;
  }
  return buf;
}

function stripPngMetadata(buf: Buffer): Buffer {
  if (buf.length < 8 || buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") return buf;
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let offset = 8;
  const drop = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
  while (offset + 12 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const end = offset + 12 + len;
    if (end > buf.length) return buf;
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (!drop.has(type)) parts.push(buf.subarray(offset, end));
    offset = end;
    if (type === "IEND") break;
  }
  return Buffer.concat(parts);
}

function stripWebpMetadata(buf: Buffer): Buffer {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return buf;
  const chunks: Buffer[] = [];
  let offset = 12;
  const drop = new Set(["EXIF", "XMP "]);
  while (offset + 8 <= buf.length) {
    const type = buf.toString("ascii", offset, offset + 4);
    const len = buf.readUInt32LE(offset + 4);
    const padded = len + (len % 2);
    const end = offset + 8 + padded;
    if (end > buf.length) return buf;
    if (!drop.has(type)) chunks.push(buf.subarray(offset, end));
    offset = end;
  }
  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const out = Buffer.alloc(8 + body.length);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(body.length, 4);
  body.copy(out, 8);
  return out;
}

function stripPrivateMetadata(buf: Buffer, contentType: string): Buffer {
  if (contentType === "image/jpeg") return stripJpegMetadata(buf);
  if (contentType === "image/png") return stripPngMetadata(buf);
  if (contentType === "image/webp") return stripWebpMetadata(buf);
  return buf;
}

async function validatedImage(file: File | Blob, opts?: { privateHealth?: boolean }) {
  const declared = ((file instanceof File ? file.type : "") || file.type || "").toLowerCase();
  const allowed = opts?.privateHealth ? PRIVATE_ALLOWED_TYPES : ALLOWED_TYPES;
  if (!allowed.has(declared)) {
    throw new Error(
      opts?.privateHealth
        ? `Unsupported health-media type "${declared || "unknown"}". Allowed: JPEG, PNG, WebP.`
        : `Unsupported file type "${declared || "unknown"}". Allowed: JPEG, PNG, WebP, GIF.`,
    );
  }
  if (file.size <= 0) throw new Error("Empty file.");
  if (file.size > R2_MAX_BYTES) {
    throw new Error(`File too large. Max size is ${R2_MAX_BYTES / (1024 * 1024)} MB.`);
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer.subarray(0, 32));
  if (!sniffed) throw new Error("File contents are not a supported image format.");
  const normalizedDeclared = declared === "image/jpg" ? "image/jpeg" : declared;
  if (sniffed !== normalizedDeclared) {
    throw new Error(`Image content does not match declared type (${declared}).`);
  }
  if (opts?.privateHealth) {
    assertSafeDimensions(buffer, sniffed);
    buffer = stripPrivateMetadata(buffer, sniffed);
  }
  return { body: buffer, contentType: sniffed, size: buffer.byteLength };
}

function privateContentTypeCode(contentType: string): number {
  if (contentType === "image/jpeg") return 1;
  if (contentType === "image/png") return 2;
  if (contentType === "image/webp") return 3;
  throw new Error("Unsupported private image type.");
}

function privateContentTypeFromCode(code: number): string | null {
  if (code === 1) return "image/jpeg";
  if (code === 2) return "image/png";
  if (code === 3) return "image/webp";
  return null;
}

function encryptPrivateObject(body: Buffer, contentType: string): Buffer {
  const key = privateStorageEncryptionKey();
  if (!key) throw new Error("Private media encryption is unavailable.");
  const typeCode = privateContentTypeCode(contentType);
  const iv = randomBytes(PRIVATE_IV_BYTES);
  const type = Buffer.from([typeCode]);
  const aad = Buffer.concat([PRIVATE_ENVELOPE_MAGIC, type]);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(body), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([PRIVATE_ENVELOPE_MAGIC, type, iv, tag, ciphertext]);
}

function decryptPrivateObject(envelope: Buffer): { body: Buffer; contentType: string } | null {
  const minLength = PRIVATE_ENVELOPE_MAGIC.length + 1 + PRIVATE_IV_BYTES + PRIVATE_TAG_BYTES + 1;
  if (envelope.length < minLength) return null;
  if (!envelope.subarray(0, PRIVATE_ENVELOPE_MAGIC.length).equals(PRIVATE_ENVELOPE_MAGIC)) return null;

  const key = privateStorageEncryptionKey();
  if (!key) return null;
  const typeOffset = PRIVATE_ENVELOPE_MAGIC.length;
  const typeCode = envelope[typeOffset];
  const contentType = privateContentTypeFromCode(typeCode);
  if (!contentType) return null;

  const ivStart = typeOffset + 1;
  const tagStart = ivStart + PRIVATE_IV_BYTES;
  const bodyStart = tagStart + PRIVATE_TAG_BYTES;
  const iv = envelope.subarray(ivStart, tagStart);
  const tag = envelope.subarray(tagStart, bodyStart);
  const ciphertext = envelope.subarray(bodyStart);
  const aad = Buffer.concat([PRIVATE_ENVELOPE_MAGIC, Buffer.from([typeCode])]);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    return {
      body: Buffer.concat([decipher.update(ciphertext), decipher.final()]),
      contentType,
    };
  } catch {
    return null;
  }
}

export type UploadResult = { key: string; url: string; contentType: string; size: number };
export type PrivateUploadResult = { key: string; reference: string; contentType: string; size: number };

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
  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: validated.body,
    ContentType: validated.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return { key, url: `${config.publicUrl}/${key}`, contentType: validated.contentType, size: validated.size };
}

/** Upload sensitive media, using a dedicated private bucket when available. */
export async function uploadPrivateImageToR2(
  file: File | Blob,
  opts?: { folder?: string },
): Promise<PrivateUploadResult> {
  const config = getPrivateR2Config();
  if (!config) {
    throw new Error("Secure R2 storage is not configured. Check the platform R2 credentials and AUTH_SECRET.");
  }
  const validated = await validatedImage(file, { privateHealth: true });
  const folder = sanitizeFolder(opts?.folder || "health-media");
  const key = `${folder}/${randomUUID()}.${extensionFor(validated.contentType)}`;
  const s3 = getClient(config);
  const body = config.encrypted
    ? encryptPrivateObject(validated.body, validated.contentType)
    : validated.body;
  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: config.encrypted ? "application/octet-stream" : validated.contentType,
    CacheControl: "private, no-store, max-age=0",
    Metadata: config.encrypted ? { "aether-private-encrypted": "aes-256-gcm-v1" } : undefined,
  }));
  return { key, reference: `${PRIVATE_PREFIX}${key}`, contentType: validated.contentType, size: validated.size };
}

export function isPrivateR2Reference(value: string): boolean {
  return value.startsWith(PRIVATE_PREFIX);
}

export function privateR2Key(value: string): string | null {
  if (!isPrivateR2Reference(value)) return null;
  const key = value.slice(PRIVATE_PREFIX.length).replace(/^\/+/, "");
  return key || null;
}

function isMissingR2Object(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.$metadata?.httpStatusCode === 404 || value.name === "NoSuchKey" || value.name === "NotFound";
}

export async function readPrivateR2Object(referenceOrKey: string): Promise<{ body: Buffer; contentType: string } | null> {
  const configs = privateR2Configs();
  if (!configs.length) return null;
  const key = privateR2Key(referenceOrKey) ?? referenceOrKey.replace(/^\/+/, "");
  if (!key) return null;

  for (const config of configs) {
    const s3 = getClient(config);
    try {
      const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
      if (!result.Body) continue;
      const bytes = Buffer.from(await result.Body.transformToByteArray());
      if (config.encrypted) {
        const decrypted = decryptPrivateObject(bytes);
        if (decrypted) return decrypted;
        continue;
      }
      return { body: bytes, contentType: result.ContentType || "application/octet-stream" };
    } catch (error) {
      if (isMissingR2Object(error)) continue;
      throw error;
    }
  }
  return null;
}

export async function privateR2ReferenceToDataUrl(reference: string): Promise<string | null> {
  const object = await readPrivateR2Object(reference);
  if (!object) return null;
  return `data:${object.contentType};base64,${object.body.toString("base64")}`;
}

function mediaTokenSecret(): string {
  const dedicated = process.env.HEALTH_MEDIA_SIGNING_SECRET?.trim();
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === "production") {
    throw new Error("HEALTH_MEDIA_SIGNING_SECRET is required in production");
  }
  const devFallback = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!devFallback) throw new Error("health_media_signing_secret_missing");
  return devFallback;
}

function mediaSignature(payload: string): string {
  return createHmac("sha256", mediaTokenSecret()).update(payload).digest("base64url");
}

export function createPrivateMediaToken(reference: string, ttlSeconds = MEDIA_TOKEN_TTL_SECONDS): string {
  const key = privateR2Key(reference);
  if (!key || !key.startsWith("symptom-uploads/")) throw new Error("invalid_private_media_reference");
  const exp = Math.floor(Date.now() / 1000) + Math.min(15 * 60, Math.max(30, ttlSeconds));
  const payload = Buffer.from(JSON.stringify({ v: 1, key, exp }), "utf8").toString("base64url");
  return `${payload}.${mediaSignature(payload)}`;
}

export function verifyPrivateMediaToken(token: string): { key: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  let expected: string;
  try {
    expected = mediaSignature(payload);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: number; key?: string; exp?: number };
    if (parsed.v !== 1 || !parsed.key?.startsWith("symptom-uploads/") || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
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
  const configs = privateR2Configs();
  if (!configs.length) throw new Error("Secure R2 storage is not configured.");
  const key = privateR2Key(referenceOrKey) ?? referenceOrKey.replace(/^\/+/, "");
  if (!key) return;
  const s3 = getClient(configs[0]);
  // Delete from every possible private backend. DeleteObject is idempotent, so
  // this also keeps encrypted fallback objects removable after a dedicated
  // private bucket is added later.
  for (const config of configs) {
    await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  }
}
