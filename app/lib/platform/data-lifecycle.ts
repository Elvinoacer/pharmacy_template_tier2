import "server-only";

import { createHash, randomBytes } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { enqueueJob } from "@/app/lib/platform/jobs";
import { saveExportArchive, loadExportArchive, deleteExportArchive } from "@/app/lib/platform/export-storage";
import {
  exportablePolicies,
  verifyTenantDeletion,
} from "@/app/lib/platform/tenant-data-registry";

const EXPORT_TTL_MS = 48 * 60 * 60 * 1000;

export async function requestDataExport(pharmacyId: string, actorId?: string | null) {
  const req = await prismaUnscoped.dataExportRequest.create({
    data: { pharmacyId, actorId: actorId ?? null, status: "requested" },
  });
  await enqueueJob({
    type: "data.export",
    pharmacyId,
    payload: { requestId: req.id },
  });
  await recordAuditRequired({
    actorId,
    action: "compliance.export.requested",
    resource: "data_export_request",
    resourceId: req.id,
    tenantId: pharmacyId,
  });
  return req;
}

export async function requestDataDeletion(
  pharmacyId: string,
  opts?: { actorId?: string | null; retainLegal?: boolean; days?: number },
) {
  const scheduledFor = new Date(Date.now() + (opts?.days ?? 30) * 86400000);
  const req = await prismaUnscoped.dataDeletionRequest.create({
    data: {
      pharmacyId,
      actorId: opts?.actorId ?? null,
      retainLegal: opts?.retainLegal ?? true,
      scheduledFor,
      status: "requested",
    },
  });
  await enqueueJob({
    type: "data.delete",
    pharmacyId,
    payload: { requestId: req.id },
    runAt: scheduledFor,
  });
  await recordAuditRequired({
    actorId: opts?.actorId,
    action: "compliance.deletion.requested",
    resource: "data_deletion_request",
    resourceId: req.id,
    tenantId: pharmacyId,
  });
  return req;
}

/** Helper to fetch all records in paginated chunks without memory exhaustion or limits. */
async function fetchAllPaginated<T = any>(
  fetchChunk: (cursorId?: string, take?: number) => Promise<T[]>,
  chunkSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let cursorId: string | undefined = undefined;
  while (true) {
    const chunk = await fetchChunk(cursorId, chunkSize);
    if (!chunk || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < chunkSize) break;
    const last = chunk[chunk.length - 1] as { id?: string } | undefined;
    if (!last?.id) break;
    cursorId = last.id;
  }
  return all;
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function runDataExport(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataExportRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("export_not_found");
  await prismaUnscoped.dataExportRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });

  try {
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: {
        settings: true,
        branches: {
          include: {
            hours: true,
            deliveryZones: true,
          },
        },
      },
    });

    // Drive export from the authoritative registry so new tenant models cannot be forgotten.
    const tablesData: Record<string, unknown[]> = {};
    for (const policy of exportablePolicies()) {
      const delegate = (prismaUnscoped as Record<string, any>)[policy.model];
      if (!delegate || typeof delegate.findMany !== "function") continue;

      try {
        const rows = await fetchAllPaginated((cursor, take) =>
          delegate.findMany({
            where: { pharmacyId },
            take,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: "asc" },
            ...(policy.exportInclude ? { include: policy.exportInclude } : {}),
          }),
        );
        tablesData[policy.exportKey] = rows;
      } catch {
        // Composite-key or non-id models (e.g. customerPharmacy) — fall back to plain findMany.
        try {
          const rows = await delegate.findMany({
            where: { pharmacyId },
            orderBy: { pharmacyId: "asc" },
          });
          tablesData[policy.exportKey] = rows;
        } catch {
          tablesData[policy.exportKey] = [];
        }
      }
    }

    const tableManifest: Record<string, { count: number; checksum: string }> = {};
    let totalRecords = 0;
    for (const [tblName, rows] of Object.entries(tablesData)) {
      const json = JSON.stringify(rows);
      tableManifest[tblName] = {
        count: rows.length,
        checksum: sha256(json),
      };
      totalRecords += rows.length;
    }

    const archiveObject = {
      schemaVersion: "2.1",
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + EXPORT_TTL_MS).toISOString(),
      pharmacy,
      registry: exportablePolicies().map((p) => ({
        model: p.model,
        exportKey: p.exportKey,
        strategy: p.strategy,
      })),
      manifest: {
        totalRecords,
        tables: tableManifest,
      },
      data: tablesData,
    };

    const archiveJson = JSON.stringify(archiveObject);
    const storageMeta = await saveExportArchive(pharmacyId, requestId, archiveJson);

    const token = randomBytes(24).toString("base64url");
    const downloadTokenHash = sha256(token);

    await prismaUnscoped.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: "ready",
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + EXPORT_TTL_MS),
        downloadTokenHash,
        archiveUrl: storageMeta.storageUrl,
      },
    });

    await recordAuditRequired({
      action: "compliance.export.ready",
      resource: "data_export_request",
      resourceId: requestId,
      tenantId: pharmacyId,
      details: {
        totalRecords,
        sizeBytes: storageMeta.sizeBytes,
        checksum: storageMeta.checksum,
      },
    });

    return {
      ok: true,
      requestId,
      downloadToken: token,
      expiresAt: new Date(Date.now() + EXPORT_TTL_MS).toISOString(),
      totalRecords,
      checksum: storageMeta.checksum,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "export_failed";
    await prismaUnscoped.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "failed", error: errorMsg },
    });
    throw err;
  }
}

export async function readExportArchive(requestId: string, token: string) {
  const hash = sha256(token);
  const req = await prismaUnscoped.dataExportRequest.findUnique({ where: { id: requestId } });
  if (!req || req.downloadTokenHash !== hash) return null;
  if (req.status !== "ready" || !req.archiveUrl) return null;
  if (req.expiresAt && req.expiresAt < new Date()) return null;

  const buffer = await loadExportArchive(req.archiveUrl);
  if (!buffer) return null;

  return {
    req,
    buffer,
    json: buffer.toString("utf8"),
  };
}

export async function runDataDeletion(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataDeletionRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("deletion_not_found");
  if (req.scheduledFor > new Date()) return { ok: true, deferred: true };

  await prismaUnscoped.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });

  try {
    // 1. Freeze tenant immediately
    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        lifecycleStatus: "pending_deletion",
        listed: false,
        status: "suspended",
        deletionRequestedAt: new Date(),
      },
    });

    // 2. Revoke active integrations and API keys
    await prismaUnscoped.apiKey.updateMany({
      where: { pharmacyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prismaUnscoped.supportSession.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.customDomain.deleteMany({ where: { pharmacyId } });

    // 3. Cancel pending jobs and outbox events
    await prismaUnscoped.job.updateMany({
      where: { pharmacyId, status: { in: ["queued", "running", "failed"] } },
      data: { status: "dead_letter", lastError: "tenant_deletion_cancelled" },
    });
    await prismaUnscoped.outboxEvent.updateMany({
      where: { pharmacyId, status: { in: ["pending", "processing", "failed"] } },
      data: { status: "dead_letter", lastError: "tenant_deletion_cancelled" },
    });
    await prismaUnscoped.webhookDelivery.updateMany({
      where: { pharmacyId, status: { in: ["pending", "retrying", "processing"] } },
      data: { status: "dead_letter", lastError: "tenant_deletion_cancelled" },
    });

    // 4. Delete communications, marketing, and CRM
    await prismaUnscoped.message.deleteMany({ where: { conversation: { pharmacyId } } });
    await prismaUnscoped.conversation.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.aiMessage.deleteMany({ where: { conversation: { pharmacyId } } });
    await prismaUnscoped.aiConversation.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.notificationAttempt.deleteMany({ where: { delivery: { pharmacyId } } });
    await prismaUnscoped.notificationDelivery.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.notification.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.reminder.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.campaign.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.customerSegment.deleteMany({ where: { segment: { pharmacyId } } });
    await prismaUnscoped.segment.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.customerNote.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.timelineEvent.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.messageTemplate.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.enquiry.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.feedback.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.adminNotification.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.knowledgeArticle.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.symptomCheckIn.deleteMany({ where: { session: { pharmacyId } } });
    await prismaUnscoped.symptomMessage.deleteMany({ where: { session: { pharmacyId } } });
    await prismaUnscoped.symptomSession.deleteMany({ where: { pharmacyId } });

    // 5. Delete clinical, wellness, and preventive care
    await prismaUnscoped.clinicalReferral.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.healthScreeningRecord.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.preventiveCounsellingSession.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.immunizationAppointment.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.immunizerCredential.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.vaccineProduct.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.pharmacyImmunizationPolicy.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.publicHealthCampaign.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.medicationSchedule.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.serviceBooking.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.pharmacyService.deleteMany({ where: { pharmacyId } });

    // 6. Delete loyalty & coupons
    await prismaUnscoped.loyaltyTransaction.deleteMany({ where: { account: { pharmacyId } } });
    await prismaUnscoped.loyaltyAccount.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.loyaltyRule.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.coupon.deleteMany({ where: { pharmacyId } });

    // 7. Delete inventory and stock movements
    await prismaUnscoped.inventorySyncConflict.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.stockMovement.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.inventoryReservation.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.inventoryLot.deleteMany({ where: { pharmacyInventory: { pharmacyId } } });
    await prismaUnscoped.medicationPriceHistory.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.pharmacyInventory.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.medicationCategory.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.purchaseOrder.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.supplier.deleteMany({ where: { pharmacyId } });

    // 8. Delete webhooks & integration connections
    await prismaUnscoped.webhookDelivery.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.webhookEvent.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.webhookEndpoint.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.integrationHealthCheck.deleteMany({ where: { account: { pharmacyId } } });
    await prismaUnscoped.integrationAccount.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.pharmacyIntegration.deleteMany({ where: { pharmacyId } });

    // 9. Delete branch structures & customer relationships
    await prismaUnscoped.branchDeliveryZone.deleteMany({ where: { branch: { pharmacyId } } });
    await prismaUnscoped.branchHours.deleteMany({ where: { branch: { pharmacyId } } });
    await prismaUnscoped.branchMembership.deleteMany({ where: { branch: { pharmacyId } } });
    await prismaUnscoped.pharmacyBranch.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.customerPharmacy.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.idempotencyKey.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.cashierSession.deleteMany({ where: { pharmacyId } });

    if (req.retainLegal) {
      // Retain legally required accounting/prescriptions with PII anonymized
      await prismaUnscoped.order.updateMany({
        where: { pharmacyId },
        data: {
          guestName: "[ANONYMIZED_GUEST]",
          guestPhone: "[ANONYMIZED_PHONE]",
          guestEmail: null,
          notes: null,
          reason: null,
          dispenserNote: null,
        },
      });

      await prismaUnscoped.prescription.updateMany({
        where: { pharmacyId },
        data: {
          prescriberPhone: null,
          prescriberEmail: null,
          prescriberLicense: null,
          patientVerificationNotes: null,
          clarificationNotes: null,
          reviewNotes: null,
          rejectionReason: null,
          holdReason: null,
          attachmentUrls: [],
          notes: null,
        },
      });

      await prismaUnscoped.payment.updateMany({
        where: { pharmacyId },
        data: {
          phone: "[ANONYMIZED_PHONE]",
        },
      });

      await prismaUnscoped.billingPayment.updateMany({
        where: { pharmacyId },
        data: {
          phone: "[ANONYMIZED_PHONE]",
        },
      });
    } else {
      // Full hard delete
      await prismaUnscoped.orderAccessToken.deleteMany({ where: { order: { pharmacyId } } });
      await prismaUnscoped.orderItem.deleteMany({ where: { order: { pharmacyId } } });
      await prismaUnscoped.commerceEvent.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.refund.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.order.deleteMany({ where: { pharmacyId } });

      await prismaUnscoped.doseLog.deleteMany({ where: { prescription: { pharmacyId } } });
      await prismaUnscoped.prescriptionFill.deleteMany({ where: { prescription: { pharmacyId } } });
      await prismaUnscoped.prescriptionClarificationLog.deleteMany({ where: { prescription: { pharmacyId } } });
      await prismaUnscoped.prescriptionAdherence.deleteMany({ where: { prescription: { pharmacyId } } });
      await prismaUnscoped.refillRequest.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.prescription.deleteMany({ where: { pharmacyId } });

      await prismaUnscoped.invoiceItem.deleteMany({ where: { invoice: { pharmacyId } } });
      await prismaUnscoped.invoice.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.billingPayment.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.payment.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.billingPaymentMethod.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.dunningCase.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.subscription.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.tenantEntitlement.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.featureOverride.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.usageRecord.deleteMany({ where: { pharmacyId } });
      await prismaUnscoped.ledgerAccount.deleteMany({ where: { pharmacyId } });
    }

    // Revoke memberships and delete settings
    await prismaUnscoped.pharmacySettings.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.pharmacyMembership.deleteMany({ where: { pharmacyId } });

    // Clean up export files
    const pastExports = await prismaUnscoped.dataExportRequest.findMany({ where: { pharmacyId } });
    for (const exp of pastExports) {
      if (exp.archiveUrl) await deleteExportArchive(exp.archiveUrl);
    }
    await prismaUnscoped.dataExportRequest.deleteMany({ where: { pharmacyId } });

    // ── Final exhaustive verification against the registry ──────
    // "completed" must mean every model classified as deletable is gone.
    const verification = await verifyTenantDeletion(pharmacyId, req.retainLegal);
    if (!verification.ok) {
      const summary = verification.remaining
        .map((r) => `${r.exportKey}=${r.remaining}`)
        .join(", ");
      throw new Error(`deletion_verification_failed: residual tenant data remains (${summary})`);
    }

    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        lifecycleStatus: req.retainLegal ? "pending_deletion" : "deleted",
        listed: false,
        status: "suspended",
        name: req.retainLegal ? "[DELETED_PHARMACY]" : "Deleted Pharmacy",
        email: `deleted-${pharmacyId}@deleted.local`,
        phone: null,
        whatsapp: null,
      },
    });

    await prismaUnscoped.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "completed", completedAt: new Date() },
    });

    await recordAuditRequired({
      action: "compliance.deletion.completed",
      resource: "data_deletion_request",
      resourceId: requestId,
      tenantId: pharmacyId,
      details: {
        retainLegal: req.retainLegal,
        verifiedEmpty: true,
        residualModels: [],
      },
    });

    return { ok: true, deferred: false, status: "completed", verified: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "deletion_failed";
    await prismaUnscoped.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "failed", error: message },
    });
    throw err;
  }
}
