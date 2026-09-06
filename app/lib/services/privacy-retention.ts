import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import {
  deleteFromR2,
  deletePrivateFromR2,
  isPrivateR2Reference,
  uploadPrivateImageToR2,
} from "@/app/lib/r2";
import { sweepOrphanPrivateSymptomMedia } from "@/app/lib/services/private-media-orphans";

function daysFromEnv(name: string, fallback: number, min = 1, max = 3650): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

function managedPublicSymptomUrl(value: string): boolean {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!base) return false;
  return value.startsWith(`${base}/symptom-uploads/`);
}

async function migrateLegacyPublicImage(reference: string, sessionId: string): Promise<string | null> {
  if (!managedPublicSymptomUrl(reference)) return null;

  const response = await fetch(reference, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`legacy_media_fetch_${response.status}`);

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 5 * 1024 * 1024) throw new Error("legacy_media_too_large");

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("legacy_media_too_large");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
  const blob = new Blob([bytes], { type: contentType });
  const migrated = await uploadPrivateImageToR2(blob, {
    folder: `symptom-uploads/${sessionId}`,
  });
  await deleteFromR2(reference);
  return migrated.reference;
}

/**
 * Privacy lifecycle maintenance. Must run under platform bypass because it
 * intentionally spans tenants, but every operation is deletion/migration only.
 */
export async function runPrivacyRetention(): Promise<{
  aiConversationsDeleted: number;
  mediaMessagesProcessed: number;
  mediaObjectsDeleted: number;
  mediaObjectsMigrated: number;
  orphanMediaScanned: number;
  orphanMediaDeleted: number;
  orphanSweepCapped: boolean;
  mediaErrors: number;
}> {
  const aiDays = daysFromEnv("AI_CONVERSATION_RETENTION_DAYS", 90, 7);
  const mediaDays = daysFromEnv("SYMPTOM_MEDIA_RETENTION_DAYS", 30, 1);
  const aiCutoff = new Date(Date.now() - aiDays * 24 * 60 * 60 * 1000);
  const mediaCutoff = new Date(Date.now() - mediaDays * 24 * 60 * 60 * 1000);

  // Retain active conversations based on last activity, not their original
  // creation date. AiMessage rows cascade at the conversation boundary.
  const aiDeleted = await prismaUnscoped.aiConversation.deleteMany({
    where: { updatedAt: { lt: aiCutoff } },
  });

  let mediaMessagesProcessed = 0;
  let mediaObjectsDeleted = 0;
  let mediaObjectsMigrated = 0;
  let mediaErrors = 0;
  let cursor: string | undefined;

  // Process bounded pages so one cleanup run cannot hold an unbounded result set.
  for (;;) {
    const rows = await prismaUnscoped.symptomMessage.findMany({
      where: { imageUrls: { isEmpty: false } },
      select: { id: true, sessionId: true, imageUrls: true, createdAt: true },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!rows.length) break;

    for (const row of rows) {
      const expired = row.createdAt < mediaCutoff;
      const nextRefs: string[] = [];
      let changed = false;

      for (const reference of row.imageUrls) {
        try {
          if (expired) {
            if (isPrivateR2Reference(reference)) {
              await deletePrivateFromR2(reference);
              mediaObjectsDeleted++;
              changed = true;
              continue;
            }
            if (managedPublicSymptomUrl(reference)) {
              await deleteFromR2(reference);
              mediaObjectsDeleted++;
              changed = true;
              continue;
            }
            // Unknown external legacy URLs are removed from the health record
            // after retention, but are never fetched/deleted by this service.
            changed = true;
            continue;
          }

          if (isPrivateR2Reference(reference)) {
            nextRefs.push(reference);
            continue;
          }

          if (managedPublicSymptomUrl(reference)) {
            const migrated = await migrateLegacyPublicImage(reference, row.sessionId);
            if (migrated) {
              nextRefs.push(migrated);
              mediaObjectsMigrated++;
              changed = true;
              continue;
            }
          }

          // Keep unknown non-managed references until their retention window;
          // do not SSRF-fetch arbitrary historic URLs.
          nextRefs.push(reference);
        } catch (err) {
          console.error("[privacy retention] media", row.id, err);
          mediaErrors++;
          nextRefs.push(reference);
        }
      }

      if (changed) {
        await prismaUnscoped.symptomMessage.update({
          where: { id: row.id },
          data: { imageUrls: expired ? [] : nextRefs },
        });
      }
      mediaMessagesProcessed++;
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < 100) break;
  }

  // Catch objects whose owning DB rows were already removed by a tenant/DSAR
  // deletion or an interrupted workflow. The grace period prevents racing a
  // fresh upload that has not yet been attached to its message row.
  const orphanSweep = await sweepOrphanPrivateSymptomMedia({
    graceMs: 60 * 60_000,
    maxObjects: 10_000,
  });
  mediaErrors += orphanSweep.errors;

  return {
    aiConversationsDeleted: aiDeleted.count,
    mediaMessagesProcessed,
    mediaObjectsDeleted,
    mediaObjectsMigrated,
    orphanMediaScanned: orphanSweep.scanned,
    orphanMediaDeleted: orphanSweep.deleted,
    orphanSweepCapped: orphanSweep.capped,
    mediaErrors,
  };
}
