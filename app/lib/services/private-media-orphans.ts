import "server-only";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { prismaUnscoped } from "@/app/lib/db";
import { deletePrivateFromR2, getPrivateR2Config } from "@/app/lib/r2";

const PREFIX = "symptom-uploads/";
const REFERENCE_PREFIX = "r2-private://";

/**
 * Delete managed private symptom objects that no longer have any database
 * reference. This is the safety net for tenant/DSAR deletion, interrupted
 * transactions, and historic orphaned uploads.
 *
 * Objects get a grace period so an upload cannot be swept between the R2 PUT
 * and the following message/database write.
 */
export async function sweepOrphanPrivateSymptomMedia(opts?: {
  graceMs?: number;
  maxObjects?: number;
}): Promise<{ scanned: number; deleted: number; errors: number; capped: boolean }> {
  const config = getPrivateR2Config();
  if (!config) return { scanned: 0, deleted: 0, errors: 0, capped: false };

  const graceMs = Math.max(5 * 60_000, opts?.graceMs ?? 60 * 60_000);
  const maxObjects = Math.max(100, Math.min(50_000, opts?.maxObjects ?? 10_000));
  const cutoff = Date.now() - graceMs;
  const s3 = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  let continuationToken: string | undefined;
  let scanned = 0;
  let deleted = 0;
  let errors = 0;
  let capped = false;

  do {
    const remaining = maxObjects - scanned;
    if (remaining <= 0) { capped = true; break; }
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
      MaxKeys: Math.min(500, remaining),
    }));
    const objects = (page.Contents ?? []).filter((o) => Boolean(o.Key));
    scanned += objects.length;

    // Only old-enough objects are candidates; recent uploads are always kept.
    const candidateKeys = objects
      .filter((o) => !o.LastModified || o.LastModified.getTime() < cutoff)
      .map((o) => o.Key as string);

    if (candidateKeys.length) {
      const refs = candidateKeys.map((key) => `${REFERENCE_PREFIX}${key}`);
      const liveRows = await prismaUnscoped.symptomMessage.findMany({
        where: { imageUrls: { hasSome: refs } },
        select: { imageUrls: true },
      });
      const live = new Set(
        liveRows.flatMap((row) => row.imageUrls).filter((ref) => ref.startsWith(`${REFERENCE_PREFIX}${PREFIX}`)),
      );

      for (const key of candidateKeys) {
        const reference = `${REFERENCE_PREFIX}${key}`;
        if (live.has(reference)) continue;
        try {
          await deletePrivateFromR2(reference);
          deleted++;
        } catch (err) {
          errors++;
          console.error("[privacy retention] orphan media delete", key, err);
        }
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  if (continuationToken) capped = true;
  s3.destroy();
  return { scanned, deleted, errors, capped };
}
