import "server-only";

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getR2Config } from "@/app/lib/r2";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const EXPORT_DIR = path.resolve(process.cwd(), "data", "exports");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function ensureExportDir(pharmacyId: string): Promise<string> {
  const dir = path.join(EXPORT_DIR, pharmacyId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export type StoredArchiveMeta = {
  storageUrl: string;
  checksum: string;
  sizeBytes: number;
};

/**
 * Persist an export archive.
 * Production requires R2/S3 — local filesystem is only allowed outside production
 * to avoid silent data loss on horizontally scaled / serverless hosts.
 */
export async function saveExportArchive(
  pharmacyId: string,
  requestId: string,
  data: string | Buffer,
): Promise<StoredArchiveMeta> {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const r2 = getR2Config();
  if (r2) {
    const key = `exports/${pharmacyId}/${requestId}.json`;
    const s3 = new S3Client({
      region: "auto",
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
      forcePathStyle: true,
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: "application/json",
        Metadata: {
          pharmacyId,
          requestId,
          checksum,
        },
      }),
    );
    return {
      storageUrl: `s3://${r2.bucket}/${key}`,
      checksum,
      sizeBytes,
    };
  }

  if (IS_PRODUCTION) {
    throw new Error(
      "export_storage_unavailable: R2/S3 is required in production. Local filesystem fallback is disabled.",
    );
  }

  // Local private storage fallback (development / test only)
  const dir = await ensureExportDir(pharmacyId);
  const filePath = path.join(dir, `${requestId}.json`);
  await fs.writeFile(filePath, buffer, { mode: 0o600 });

  return {
    storageUrl: `file://${filePath}`,
    checksum,
    sizeBytes,
  };
}

export async function loadExportArchive(storageUrl: string): Promise<Buffer | null> {
  try {
    if (storageUrl.startsWith("s3://") || storageUrl.startsWith("r2://")) {
      const r2 = getR2Config();
      if (!r2) return null;
      const parts = storageUrl.replace(/^(s3|r2):\/\/[^/]+\//, "");
      const s3 = new S3Client({
        region: "auto",
        endpoint: r2.endpoint,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
        forcePathStyle: true,
      });
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: r2.bucket,
          Key: parts,
        }),
      );
      if (!res.Body) return null;
      const chunks: Uint8Array[] = [];
      // @ts-expect-error async iterator on Body stream
      for await (const chunk of res.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    if (storageUrl.startsWith("file://")) {
      if (IS_PRODUCTION) {
        // Do not serve local-file URLs in production (stale/invalid after scale-out).
        return null;
      }
      const filePath = storageUrl.replace(/^file:\/\//, "");
      return await fs.readFile(filePath);
    }

    if (storageUrl.startsWith("data:")) {
      const base64Data = storageUrl.split(",")[1];
      if (!base64Data) return null;
      return Buffer.from(base64Data, "base64");
    }

    return null;
  } catch {
    return null;
  }
}

export async function deleteExportArchive(storageUrl: string): Promise<void> {
  try {
    if (storageUrl.startsWith("s3://") || storageUrl.startsWith("r2://")) {
      const r2 = getR2Config();
      if (!r2) return;
      const key = storageUrl.replace(/^(s3|r2):\/\/[^/]+\//, "");
      const s3 = new S3Client({
        region: "auto",
        endpoint: r2.endpoint,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
        forcePathStyle: true,
      });
      await s3.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
      return;
    }

    if (storageUrl.startsWith("file://") && !IS_PRODUCTION) {
      const filePath = storageUrl.replace(/^file:\/\//, "");
      await fs.unlink(filePath).catch(() => {});
    }
  } catch {
    // Best effort cleanup
  }
}
